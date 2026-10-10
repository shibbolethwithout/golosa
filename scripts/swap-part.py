#!/usr/bin/env python3
"""
Меняет «часть N» → «N часть» в #EXTINF строках .m3u.

Примеры:
  Горячее сердце 1975 — часть 1   →  Горячее сердце 1975 — 1 часть
  Часть 12                          →  12 часть
  титр                              →  без изменений

Использование:
    python3 scripts/swap-part.py --dry
    python3 scripts/swap-part.py
"""

import re
import sys
from pathlib import Path

M3U_DIR = Path.home() / 'Music' / 'Music' / 'Radio'

# «часть 1» → «1 часть» (с сохранением регистра «часть»/«Часть»)
PART_RE = re.compile(r'\b([Чч])асть\s+(\d+)\b')


def clean_title(title: str) -> str:
    return PART_RE.sub(lambda m: f'{m.group(2)} {m.group(1)}асть', title)


def process_line(line: str) -> str:
    if not line.startswith('#EXTINF:'):
        return line
    comma = line.find(',')
    if comma < 0:
        return line
    prefix = line[:comma + 1]
    title = line[comma + 1:]
    return prefix + clean_title(title)


def main():
    dry = '--dry' in sys.argv
    files = sorted(M3U_DIR.glob('*.m3u'))

    changed = []
    total = 0
    for f in files:
        original = f.read_text(encoding='utf-8')
        new_lines = [process_line(line) for line in original.split('\n')]
        new_text = '\n'.join(new_lines)
        if new_text != original:
            diff = sum(1 for a, b in zip(
                original.split('\n'), new_lines) if a != b)
            changed.append((f.name, diff))
            total += diff
            if not dry:
                f.write_text(new_text, encoding='utf-8')

    print(f'📁 Плейлистов: {len(files)}')
    print(f'📝 Изменено файлов: {len(changed)}')
    print(f'   Затронуто строк: {total}\n')

    for name, count in changed[:15]:
        print(f'   • {name}  ({count})')
    if len(changed) > 15:
        print(f'   ... и ещё {len(changed) - 15}')

    if dry:
        print('\n➡️  Предпросмотр. Запустите без --dry для применения.')
    else:
        print('\n💾 Готово.')


if __name__ == '__main__':
    main()
