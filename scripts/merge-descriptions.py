#!/usr/bin/env python3
"""
Добавляет описания из batch-файла в overrides.json.
Не трогает уже заполненные поля.

Использование:
    python3 scripts/merge-descriptions.py batch.json
"""

import json
import sys
from pathlib import Path

OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'

def main():
    if len(sys.argv) < 2:
        print('Использование: python3 scripts/merge-descriptions.py <batch.json>')
        sys.exit(1)

    batch_path = Path(sys.argv[1])
    if not batch_path.exists():
        print(f'❌ Не найден файл: {batch_path}')
        sys.exit(1)

    overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))
    batch = json.loads(batch_path.read_text(encoding='utf-8'))

    added = updated = skipped = 0
    for key, desc in batch.items():
        if key not in overrides:
            overrides[key] = {}
        current = overrides[key].get('description')
        if current and current.strip():
            skipped += 1
            continue
        overrides[key]['description'] = desc
        if current is None:
            added += 1
        else:
            updated += 1

    OVERRIDES.write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    print(f'💾 Готово:')
    print(f'   + новых:        {added}')
    print(f'   ~ обновлено:    {updated}')
    print(f'   ⏭  пропущено:   {skipped}')

if __name__ == '__main__':
    main()
