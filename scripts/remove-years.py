#!/usr/bin/env python3
"""
Убирает год (4 цифры: 1900–2099) из строк #EXTINF в .m3u плейлистах.

Что делает:
  - Находит все .m3u в ~/Music/Music/Radio/
  - В строках #EXTINF удаляет год из заголовка трека
  - URL, #EXTM3U и остальные строки не трогает
  - Имена файлов .m3u НЕ меняет

Примеры:
  Горячее сердце 1975 — часть 1   →  Горячее сердце — часть 1
  Тихий Дон 1978                   →  Тихий Дон
  Дети солнца, 1905 — часть 1      →  Дети солнца — часть 1

Использование:
    python3 scripts/remove-years.py --dry
    python3 scripts/remove-years.py
"""

import re
import sys
from pathlib import Path

M3U_DIR = Path.home() / 'Music' / 'Music' / 'Radio'

# Год: 19xx или 20xx, не часть более длинного числа
YEAR_RE = re.compile(r'(?<!\d)(19\d{2}|20\d{2})(?!\d)')


def clean_title(title: str) -> str:
    """Удаляет год из заголовка, чистит лишние пробелы и знаки."""
    # 1. Убираем год
    result = YEAR_RE.sub('', title)

    # 2. Сжимаем множественные пробелы
    result = re.sub(r'\s+', ' ', result)

    # 3. Убираем пробел перед запятой/тире: " , " → ", "
    result = re.sub(r'\s+([,.])', r'\1', result)

    # 4. ", —" → " —" (запятая перед тире не нужна)
    result = re.sub(r',\s*([—–-])', r' \1', result)

    # 5. Убираем пробелы в начале/конце и одиночные знаки
    result = result.strip(' -—–,')

    return result


def process_line(line: str) -> str:
    """Обрабатывает одну строку. Если #EXTINF — чистит заголовок."""
    if not line.startswith('#EXTINF:'):
        return line

    # Формат: #EXTINF:<duration>,<title>
    comma = line.find(',')
    if comma < 0:
        return line

    prefix = line[:comma + 1]  # "#EXTINF:-1,"
    title = line[comma + 1:]   # "Горячее сердце 1975 — часть 1"
    cleaned = clean_title(title)
    return prefix + cleaned


def process_file(path: Path, dry: bool) -> bool:
    """Возвращает True, если файл изменён."""
    original = path.read_text(encoding='utf-8')
    lines = original.split('\n')
    new_lines = [process_line(line) for line in lines]
    new_text = '\n'.join(new_lines)

    if new_text == original:
        return False

    if not dry:
        path.write_text(new_text, encoding='utf-8')
    return True


def main():
    dry = '--dry' in sys.argv

    if not M3U_DIR.is_dir():
        print(f'❌ Не найдена папка: {M3U_DIR}')
        sys.exit(1)

    files = sorted(M3U_DIR.glob('*.m3u'))
    print(f'📁 Плейлистов: {len(files)}')

    changed = []
    total_lines = 0

    for f in files:
        # Считаем, сколько строк изменится (для отчёта)
        original = f.read_text(encoding='utf-8')
        new_lines = [process_line(line) for line in original.split('\n')]
        diff_count = sum(
            1 for old, new in zip(original.split('\n'), new_lines)
            if old != new
        )
        if diff_count > 0:
            changed.append((f.name, diff_count))
            total_lines += diff_count
            if not dry:
                process_file(f, dry=False)

    print(f'\n📝 Изменено файлов: {len(changed)}')
    print(f'   Затронуто строк #EXTINF: {total_lines}')
    print()

    for name, count in changed[:20]:
        print(f'   • {name}  ({count} строк)')
    if len(changed) > 20:
        print(f'   ... и ещё {len(changed) - 20}')

    if dry:
        print('\n➡️  Это предпросмотр. Запустите без --dry, чтобы применить.')
    else:
        print('\n💾 Готово. Изменения применены.')


if __name__ == '__main__':
    main()
