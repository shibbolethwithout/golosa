#!/usr/bin/env python3
"""
Универсальный merge batch → overrides.json.
Поля: genre, tags, description, author.
Не перезаписывает непустые значения.

Использование:
    python3 scripts/merge-overrides.py batch.json
"""

import json
import sys
from pathlib import Path

OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'
FIELDS = ('genre', 'tags', 'description', 'author')


def is_empty(v):
    return v is None or (isinstance(v, (list, str)) and len(v) == 0)


def main():
    if len(sys.argv) < 2:
        print('Использование: python3 scripts/merge-overrides.py <batch.json>')
        sys.exit(1)

    batch_path = Path(sys.argv[1])
    if not batch_path.exists():
        print(f'❌ Не найден: {batch_path}')
        sys.exit(1)

    overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))
    batch = json.loads(batch_path.read_text(encoding='utf-8'))

    added = skipped = 0
    for key, fields in batch.items():
        if key not in overrides:
            overrides[key] = {}
        for f in FIELDS:
            if f not in fields:
                continue
            if is_empty(overrides[key].get(f)):
                overrides[key][f] = fields[f]
                added += 1
            else:
                skipped += 1

    OVERRIDES.write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    print(f'💾 Добавлено полей: {added}')
    print(f'   Пропущено:       {skipped}')


if __name__ == '__main__':
    main()
