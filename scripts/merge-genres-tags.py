#!/usr/bin/env python3
"""
Добавляет genre/tags из батча в overrides.json.
НЕ перезаписывает уже существующие непустые значения.

Использование:
    python3 scripts/merge-genres-tags.py batch.json
"""

import json
import sys
from pathlib import Path

OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'


def is_empty(v):
    return v is None or (isinstance(v, list) and len(v) == 0)


def main():
    if len(sys.argv) < 2:
        print('Использование: python3 scripts/merge-genres-tags.py <batch.json>')
        sys.exit(1)

    batch_path = Path(sys.argv[1])
    if not batch_path.exists():
        print(f'❌ Не найден файл: {batch_path}')
        sys.exit(1)

    overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))
    batch = json.loads(batch_path.read_text(encoding='utf-8'))

    added_genre = added_tags = skipped = 0

    for key, fields in batch.items():
        if key not in overrides:
            overrides[key] = {}
        target = overrides[key]

        for field in ('genre', 'tags'):
            if field not in fields:
                continue
            if not is_empty(target.get(field)):
                skipped += 1
                continue
            target[field] = fields[field]
            if field == 'genre':
                added_genre += 1
            else:
                added_tags += 1

    OVERRIDES.write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    print(f'💾 Готово:')
    print(f'   + genre:      {added_genre}')
    print(f'   + tags:       {added_tags}')
    print(f'   ⏭  пропущено: {skipped}')


if __name__ == '__main__':
    main()
