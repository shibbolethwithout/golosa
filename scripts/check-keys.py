#!/usr/bin/env python3
"""
Проверка соответствия ключей overrides.json и имён .m3u файлов.

Находит:
  - Ключи в overrides, для которых нет .m3u файла (сироты)
  - .m3u файлы, которых нет в overrides (непокрытые)

Использование:
    python3 scripts/check-keys.py
"""

import json
import os
from pathlib import Path

M3U_DIR = Path.home() / 'Music' / 'Music' / 'Radio'
OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'


def main():
    if not M3U_DIR.is_dir():
        print(f'❌ Нет папки: {M3U_DIR}')
        return

    overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))

    # Имена файлов без .m3u
    files = {
        p.stem for p in M3U_DIR.glob('*.m3u')
    }

    # Ключи overrides
    keys = set(overrides.keys())

    orphans = sorted(keys - files)
    uncovered = sorted(files - keys)

    print(f'📊 Статистика:')
    print(f'   .m3u файлов:       {len(files)}')
    print(f'   Ключей в overrides: {len(keys)}')
    print(f'   Совпадает:         {len(keys & files)}')
    print()

    if orphans:
        print(f'⚠️  СИРОТЫ — есть в overrides, но нет .m3u ({len(orphans)}):')
        for o in orphans[:50]:
            print(f'   • {o}')
        if len(orphans) > 50:
            print(f'   ... и ещё {len(orphans) - 50}')
        print()
        print('   Что делать: переименовать ключ в overrides под новое имя файла,')
        print('   или удалить, если файл больше не нужен.')
        print()

    if uncovered:
        print(f'⚠️  НЕПОКРЫТЫЕ — есть .m3u, но нет в overrides ({len(uncovered)}):')
        for u in uncovered[:50]:
            print(f'   • {u}')
        if len(uncovered) > 50:
            print(f'   ... и ещё {len(uncovered) - 50}')
        print()
        print('   Что делать: добавить в overrides (если нужно) или оставить как есть.')
        print()

    if not orphans and not uncovered:
        print('✅ Всё в порядке — ключи соответствуют файлам.')


if __name__ == '__main__':
    main()
