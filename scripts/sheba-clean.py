#!/usr/bin/env python3
"""
Очистка radio_plays_final.json (v3):
- расширенный отсев служебных ролей и мусора
- отсев мусора по форме (даты, обрывки, длинные строки)
- разделение на actors / staff
"""

import json
import re
from pathlib import Path

SRC = Path('scripts/radio_plays_final.json')
OUT = Path('scripts/sheba-clean.json')

# ─── Служебные роли → в staff ───
STAFF_ROLE = re.compile(
    r'('
    r'Режисс[её]р|Режиссёры|Режиссер|Постановк|'
    r'Композитор|'
    r'Звукорежисс[её]р|Звукооператор|'
    r'Инсценировк|Сценарий|'
    r'Автор пьесы|Авторы инсценировки|'
    r'Художник|'
    r'Дириж[её]р|'
    r'Стихи|'
    r'Партия|Партии|Соло|Солист|Солисты|'
    r'Музыка\s*\(использ|'
    r'Интермедии|Помощник режиссера|Руководитель постановки'
    r')',
    re.I
)

# ─── Мусор → выбросить совсем ───
JUNK_ROLE = re.compile(
    r'('
    r'Ogg|Огг|Vorbus|Vorbis|mp3PRO|mp3|aacPlus|aac|kbps|kHz|Hz|'
    r'Полное содержание|Краткое содержание|КРАТКОЕ СОДЕРЖАНИЕ|'
    r'Мастеринг|Ремастеринг|'
    r'Продюсер|Саундпродюсер|Шеф-редактор|'
    r'Роман\s*\(|Трагедия\s*\(|Повесть\s*\(|Поэма\s*\(|Комедия\s*\(|Пьеса-сказка\s*\(|'
    r'По книге|'
    r'Редактор|Музыкальный редактор|Литературный редактор|'
    r'Ассистент|'
    r'Шумовое оформление|Музыкальное оформление|'
    r'За окнами|Место действия|Премьера|'
    r'Пояснительный текст|пояснительный текст|'
    r'Комментарии|'
    r'В главной роли|В остальных ролях|'
    r'а также|в эпизоде|в эпизодах|В эпизоде|В эпизодах|'
    r'Ведущая|Ведущий|Ведущие|'
    r'От редакции|Вступление|Вст\.\s*слово|Вступ\.\s*слово|'
    r'Место и время|Песни исполняют|'
    r'Звукоподражание|'
    r'от автора|От автора'
    r')',
    re.I
)

JUNK_NAME = re.compile(
    r'(^\d+[,:]\d+\s*[Mm][Bb]$|^\d+:\d+\s*$|kbps|kHz|^\d+\s*—|^\d+[,.]\d+\s*M?B$|^—+$)',
    re.I
)

# Мусор по форме role
FORM_JUNK_ROLE = re.compile(
    r'('
    r'^\d{1,2}\s+[а-я]|'          # «17 февраля 1902 г»
    r'^\d{4}\b|'                   # «1775»
    r'^[А-ЯЁ]\s*[А-ЯЁ](\s*[А-ЯЁ])*$|'  # «К Т О», «Л Е Д Ю К»
    r'^\([^)]*$|'                  # «(Вполоборота»
    r'^«[^»]*»?$|'                 # ««Написали вместе»
    r'^—|'                         # «— Ну дайте...»
    r'^[a-zA-Z]+$|'                # англ. слово в role
    r'^[A-Z]\.\s|'                 # «W. Somerset...»
    r'[.?!:]\s.*[.?!:]'            # две точки/восклицания — признак предложения
    r')'
)

# Мусор по форме name
FORM_JUNK_NAME = re.compile(
    r'('
    r'^«|»$|'
    r'^\d{4}$|'                    # просто год: «1889»
    r'^\d{4}\s*[-—]\s*\d{4}|'      # «1963-1970»
    r'^\d{4}\s*г|'                 # «1952 г»
    r'^\d{1,2}\s+[а-я]+|'          # «20 декабря 1968 г»
    r'^Роман\s*\(|'                # «Роман (1902)»
    r'^Краткое содержание|КРАТКОЕ СОДЕРЖАНИЕ'
    r')'
)


def clean_name(name):
    if not isinstance(name, str):
        return None
    n = name.strip()
    n = re.sub(r'\s*\(\s*на фото[^)]*\)', '', n, flags=re.I)
    n = re.sub(r'\s*\(\s*фото[^)]*\)', '', n, flags=re.I)
    n = re.sub(r'\s*\(зн\.[^)]*\)', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    n = n.rstrip(' .,;')
    if not n or len(n) < 2:
        return None
    if JUNK_NAME.search(n) or FORM_JUNK_NAME.search(n):
        return None
    return n


def is_valid_role(role):
    if not role or len(role.strip()) < 2:
        return False
    # Слишком длинная роль — это точно не роль, а строка из текста
    if len(role) > 100:
        return False
    if FORM_JUNK_ROLE.search(role.strip()):
        return False
    return True


def split_cast(cast):
    actors, staff = [], []
    for item in cast or []:
        if not isinstance(item, dict):
            continue
        role = (item.get('role_or_job') or '').strip()
        name = (item.get('name') or '').strip()
        if not role or not name:
            continue

        # Мусор — пропускаем
        if JUNK_ROLE.search(role) or JUNK_NAME.search(name):
            continue

        if not is_valid_role(role):
            continue

        cleaned = clean_name(name)
        if not cleaned:
            continue

        entry = {'role': role, 'name': cleaned}

        if STAFF_ROLE.search(role):
            staff.append(entry)
        else:
            actors.append(entry)

    return actors, staff


def main():
    if not SRC.exists():
        print(f'❌ Не найден: {SRC}')
        return
    data = json.loads(SRC.read_text(encoding='utf-8'))

    kept = []
    no_actors = 0
    garbage_title = 0
    staff_total = 0
    actors_total = 0

    for item in data:
        title = (item.get('title') or '').strip()
        if not title or len(title) < 3:
            garbage_title += 1
            continue

        actors, staff = split_cast(item.get('cast'))

        if not actors:
            no_actors += 1
            continue

        kept.append({
            'url': item.get('url'),
            'title': title,
            'theater': (item.get('theater') or '').strip(),
            'year': item.get('year') or '',
            'actors': actors,
            'staff': staff,
        })
        staff_total += len(staff)
        actors_total += len(actors)

    OUT.write_text(json.dumps(kept, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'📊 Всего в исходнике:       {len(data)}')
    print(f'   Оставлено:               {len(kept)}')
    print(f'   Записей без актёров:     {no_actors}')
    print(f'   Мусорный title:          {garbage_title}')
    print(f'   Всего actors-записей:    {actors_total}')
    print(f'   Всего staff-записей:     {staff_total}')
    print(f'💾 {OUT}')


if __name__ == '__main__':
    main()
