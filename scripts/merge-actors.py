#!/usr/bin/env python3
"""
Добавляет actors из батча в overrides.json.
НЕ перезаписывает уже существующие непустые значения (если не --force).

Сверяется с каноническим списком actors-canonical.json.

Использование:
    python3 scripts/merge-actors.py batch.json
    python3 scripts/merge-actors.py batch.json --force   # перезаписать
"""

import json
import sys
from pathlib import Path

OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'
CANONICAL = Path(__file__).resolve().parent / 'actors-canonical.json'


def is_empty(v):
    return v is None or (isinstance(v, list) and len(v) == 0)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv

    if not args:
        print('Использование: python3 scripts/merge-actors.py <batch.json> [--force]')
        sys.exit(1)

    batch_path = Path(args[0])
    if not batch_path.exists():
        print(f'❌ Не найден файл: {batch_path}')
        sys.exit(1)

    overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))
    batch = json.loads(batch_path.read_text(encoding='utf-8'))

    # Загружаем канонический список
    canonical = set()
    if CANONICAL.exists():
        canonical = set(json.loads(CANONICAL.read_text(encoding='utf-8')))
        print(f'📋 Канонический список: {len(canonical)} актёров')
    else:
        print('📋 Канонический список пуст — все актёры будут считаться новыми')
    print()

    added = skipped = updated = 0
    unknown = set()
    not_in_overrides = []

    for key, fields in batch.items():
        if 'actors' not in fields:
            continue

        actors = fields['actors']
        if not isinstance(actors, list):
            print(f'⚠️  {key}: actors не список')
            continue

        # Чистим и проверяем формат
        cleaned = []
        for a in actors:
            if not isinstance(a, str):
                print(f'⚠️  {key}: {a!r} не строка')
                continue
            a = a.strip()
            if not a:
                continue
            cleaned.append(a)
            if canonical and a not in canonical:
                unknown.add(a)

        if key not in overrides:
            overrides[key] = {}
            not_in_overrides.append(key)

        target = overrides[key]

        if not is_empty(target.get('actors')) and not force:
            skipped += 1
            continue

        if is_empty(target.get('actors')):
            added += 1
        else:
            updated += 1

        target['actors'] = cleaned

    # Обновляем канонический список
    if unknown:
        new_canonical = sorted(canonical | unknown)
        CANONICAL.write_text(
            json.dumps(new_canonical, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8'
        )

    OVERRIDES.write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )

    print('💾 Готово:')
    print(f'   + добавлено:   {added}')
    print(f'   🔄 обновлено:  {updated}')
    print(f'   ⏭  пропущено:  {skipped}')

    if not_in_overrides:
        print(f'\n⚠️  Ключей не было в overrides.json: {len(not_in_overrides)}')
        for k in not_in_overrides[:10]:
            print(f'   {k}')
        if len(not_in_overrides) > 10:
            print(f'   ... и ещё {len(not_in_overrides) - 10}')

    if unknown:
        print(f'\n🆕 Новых актёров (добавлены в canonical): {len(unknown)}')
        for a in sorted(unknown)[:20]:
            print(f'   {a}')
        if len(unknown) > 20:
            print(f'   ... и ещё {len(unknown) - 20}')


if __name__ == '__main__':
    main()
