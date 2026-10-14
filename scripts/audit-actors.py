#!/usr/bin/env python3
"""
Аудит актёров в overrides.json:
- Собирает уникальных актёров
- Ищет однофамильцев с разными инициалами (потенциальные дубли)
- Проверяет формат (Фамилия_ИО)
- Экспортирует список в actors-canonical.json

Использование:
    python3 scripts/audit-actors.py
"""

import json
import re
from pathlib import Path
from collections import Counter, defaultdict

OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'
OUTPUT = Path(__file__).resolve().parent / 'actors-canonical.json'


def main():
    data = json.loads(OVERRIDES.read_text(encoding='utf-8'))

    all_actors = Counter()
    for key, fields in data.items():
        for a in fields.get('actors') or []:
            if isinstance(a, str):
                all_actors[a] += 1

    print(f'📊 Всего уникальных актёров: {len(all_actors)}\n')

    # Формат
    bad = []
    for a, cnt in all_actors.items():
        if a != a.strip():
            bad.append((a, cnt, 'пробелы по краям'))
            continue
        if '_' not in a:
            bad.append((a, cnt, 'нет "_"'))
            continue
        surname, initials = a.split('_', 1)
        if not surname:
            bad.append((a, cnt, 'пустая фамилия'))
        elif not initials:
            bad.append((a, cnt, 'нет инициалов'))
        elif not re.match(r'^[А-ЯЁ]', surname):
            bad.append((a, cnt, 'фамилия не с заглавной'))
        elif not re.match(r'^[А-ЯЁ]+$', initials):
            bad.append((a, cnt, f'инициалы содержат не-заглавные: {initials!r}'))

    if bad:
        print(f'⚠️  Проблемы формата ({len(bad)}):')
        for a, cnt, reason in bad:
            print(f'   {a!r} ({cnt} раз) — {reason}')
        print()

    # Дубли по фамилии
    by_surname = defaultdict(list)
    for a in all_actors:
        if '_' in a:
            s = a.split('_', 1)[0]
            by_surname[s].append(a)

    dups = {s: names for s, names in by_surname.items() if len(names) > 1}

    if dups:
        print(f'🔍 Однофамильцы с разными инициалами ({len(dups)} фамилий):')
        for s, names in sorted(dups.items()):
            print(f'   {s}:')
            for n in names:
                print(f'      {n}  ({all_actors[n]})')
        print()

    # Экспорт канонического списка
    canonical = sorted(all_actors.keys())
    OUTPUT.write_text(
        json.dumps(canonical, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    print(f'💾 Канонический список сохранён: {OUTPUT}')
    print(f'   Размер: {len(canonical)} актёров')


if __name__ == '__main__':
    main()
