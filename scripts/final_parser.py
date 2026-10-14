import requests
from bs4 import BeautifulSoup
import json
import re
from urllib.parse import urljoin

# Полный список разделов, предоставленный вами + корректировки
INDEX_URLS = [
    "https://sheba.spb.ru/radio.htm",
    "https://sheba.spb.ru/radio2.htm",
    "https://sheba.spb.ru/radio3.htm",
    "https://sheba.spb.ru/radio4.htm",
    "https://sheba.spb.ru/rs/", # Исправлено на конкретный файл, так надежнее
    "https://sheba.spb.ru/rs/radio6.htm",
    "https://sheba.spb.ru/rs/radio7.htm",
    "https://sheba.spb.ru/rs/radio8.htm"
]

def get_soup(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, headers=headers, timeout=15)
        
        # --- ЛЕЧЕНИЕ КОДИРОВКИ ---
        # Пробуем декодировать как utf-8, если ошибка или кракозябры - пробуем cp1251
        content = r.content
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('cp1251', errors='replace')
        
        # Иногда сайт отдает UTF-8, но в метатегах cp1251, и наоборот.
        # Если в тексте много "РЎРє", значит это utf-8 прочитанный как cp1251.
        if "РЎ" in text and "Р°" in text: 
             # Это признак битой кодировки, перекодируем принудительно
             text = content.decode('utf-8', errors='ignore')

        return BeautifulSoup(text, 'html.parser')
    except Exception as e:
        print(f"Error loading {url}: {e}")
        return None

def is_garbage_line(role, name):
    """
    Фильтр, который отличает 'Роль — Актер' от 'Прямая речь — Текст'.
    """
    role = role.strip()
    name = name.strip()

    # 1. Слишком длинная роль или имя = скорее всего текст книги
    if len(role) > 70 or len(name) > 100:
        return True

    # 2. Если имя актера начинается с маленькой буквы (диалог: "- привет, - сказал он")
    if name and name[0].islower():
        return True

    # 3. Запрещенные символы в имени актера (вопросы, восклицания, кавычки-елочки в начале)
    if any(char in name for char in ['?', '!', '...']):
        return True
    
    # 4. Стоп-слова в роли (признаки повествования)
    narrative_markers = ['сказал', 'спросил', 'ответил', 'заметила', 'кивнув', 'берясь', 'попытки', 'пер.', 'перевод']
    if any(marker in role.lower() for marker in narrative_markers):
        return True
        
    # 5. Если "имя актера" содержит слишком много слов (больше 5), это скорее всего предложение
    if len(name.split()) > 5:
        return True

    return False

def parse_play_page(url):
    soup = get_soup(url)
    if not soup:
        return None

    data = {
        "url": url,
        "title": "",
        "theater": "",
        "year": "",
        "staff": [],
        "cast": []
    }

    # Поиск заголовка
    h1 = soup.find(['h1', 'h2'])
    if h1:
        data['title'] = h1.get_text(strip=True)

    main_content = soup.find('div', class_='main') or soup.body
    if not main_content:
        return None
    
    # Разбиваем текст на строки
    text_content = main_content.get_text("\n")
    lines = [line.strip() for line in text_content.split('\n') if line.strip()]

    # Флаг, чтобы остановить парсинг, если начался текст книги
    stop_parsing = False
    
    for i, line in enumerate(lines):
        if stop_parsing: break
        
        # --- ПРИЗНАКИ НАЧАЛА ТЕКСТА КНИГИ (СТОП-СЛОВА) ---
        # Если встречаем заголовки частей, глав или большие куски текста, останавливаемся
        lower_line = line.lower()
        if len(line) > 300: # Очень длинный абзац — точно текст
            stop_parsing = True
            break
        if "глава" in lower_line and len(line) < 20: # "Глава 1"
            stop_parsing = True
            break
        if "действие" in lower_line and len(line) < 20: # "Действие первое"
            stop_parsing = True
            break
        
        # Ищем Метаданные (Год, Театр)
        if ("Спектакль" in line or "театр" in line.lower() or "Запись" in line) and len(line) < 150:
            if not data['theater']:
                data['theater'] = line
            
            year_match = re.search(r'\b(19\d{2}|20\d{2})\b', line)
            if year_match:
                data['year'] = year_match.group(1)
            continue

        # Ищем Роли
        # Разделитель: длинное тире, среднее тире или дефис, окруженный пробелами
        if re.search(r'\s[—–-]\s', line):
            parts = re.split(r'\s[—–-]\s', line, maxsplit=1)
            
            if len(parts) == 2:
                role_raw = parts[0].strip(' .,;')
                name_raw = parts[1].strip(' .,;')
                
                if is_garbage_line(role_raw, name_raw):
                    continue
                
                # Классификация
                staff_keywords = ['Режиссёр', 'Постановка', 'Звукорежиссёр', 'От автора', 'Композитор', 'Инсценировка', 'Ведущий', 'Текст']
                is_staff = any(keyword in role_raw for keyword in staff_keywords)
                
                entry = {"role_or_job": role_raw, "name": name_raw}
                
                if is_staff:
                    data['staff'].append(entry)
                else:
                    data['cast'].append(entry)

    # Если мы не нашли ни актеров, ни названия, страница бесполезна
    if not data['title'] and not data['cast']:
        return None

    return data

def main():
    all_play_links = set()
    print("Сбор ссылок (это может занять минуту)...")
    
    for index_url in INDEX_URLS:
        print(f"Сканируем: {index_url}")
        soup = get_soup(index_url)
        if not soup: continue
            
        for a in soup.find_all('a', href=True):
            href = a['href']
            # Собираем ссылки на спектакли
            # Они должны быть .htm, не быть системными
            if href.endswith('.htm') and 'index' not in href:
                # Фильтр: ссылки на спектакли обычно лежат в корне /radio/ или /rs/
                # Исключаем ссылки на сами страницы разделов (radio2.htm и т.д.)
                if href.split('/')[-1] not in [u.split('/')[-1] for u in INDEX_URLS]:
                    full_url = urljoin(index_url, href)
                    all_play_links.add(full_url)

    sorted_links = sorted(list(all_play_links))
    total = len(sorted_links)
    print(f"\nНайдено уникальных страниц: {total}")
    print("Начинаем парсинг... (Вывод прогресса каждые 20 записей)")
    
    results = []
    for i, link in enumerate(sorted_links):
        if i % 20 == 0: 
            print(f"[{i}/{total}] Обработано...")
        
        play_data = parse_play_page(link)
        if play_data:
            results.append(play_data)

    # Сохраняем
    filename = 'radio_plays_final.json'
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\nГотово! Всего записей: {len(results)}. Файл: {filename}")

if __name__ == "__main__":
    main()

