#!/usr/bin/env python3
"""
Правит жанры в overrides.json:

1. ЗАМЕНА:  советская_литература → советская_проза
2. УДАЛЕНИЕ: проза (слишком общее)
3. Дедупликация после замены.

Использование:
    python3 scripts/remove-genres.py --dry
    python3 scripts/remove-genres.py
"""

import json
import sys
from pathlib import Path

OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'

# Замена одного жанра на другой
REPLACE = {
    'советская_литература': 'советская_проза',
}

# Просто удалить (без замены)
TO_REMOVE = {'проза', 'пьеса'}


def process_genres(genres):
    """Заменить, удалить, дедуплицировать. Сохраняет порядок."""
    result = []
    seen = set()
    for g in genres:
        # 1. Замена
        g2 = REPLACE.get(g, g)
        # 2. Удаление
        if g2 in TO_REMOVE:
            continue
        # 3. Дедупликация
        if g2 in seen:
            continue
        seen.add(g2)
        result.append(g2)
    return result


def main():
    dry = '--dry' in sys.argv
    data = json.loads(OVERRIDES.read_text(encoding='utf-8'))
    changes = []

    for key, fields in data.items():
        if not isinstance(fields, dict):
            continue
        if 'genre' in fields and isinstance(fields['genre'], list):
            old = fields['genre']
            new = process_genres(old)
            if old != new:
                changes.append((key, old, new))
                fields['genre'] = new

    print(f'📝 Изменений: {len(changes)}')
    for key, old, new in changes[:20]:
        print(f'  {key[:50]}:')
        print(f'    было:  {old}')
        print(f'    стало: {new}')
    if len(changes) > 20:
        print(f'  ... и ещё {len(changes) - 20}')

    if dry:
        print('\n➡️  Запустите без --dry, чтобы применить.')
        return

    if changes:
        backup = OVERRIDES.with_suffix('.json.bak')
        backup.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        OVERRIDES.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8'
        )
        print(f'\n💾 Сохранено. Бэкап: {backup.name}')
    else:
        print('\n✅ Изменений не требуется.')


if __name__ == '__main__':
    main()
