#!/usr/bin/env python3
"""
Нормализация ФОРМЫ в overrides.json.
Смысл не трогает. Только регистр, пробелы, знаки.

Правила:
  - обычные жанры/теги: lowercase + _
  - имена героев: Capitalize каждое слово
  - римские века: UPPERCASE (XIX_век, XVIII_век)
  - опечатки: явный словарь FIXES
"""

import json
import re
import sys
from pathlib import Path

OVERRIDES = Path(__file__).resolve().parent / 'overrides.json'

# Явные опечатки
FIXES = {
    'физака': 'физика',
    'крартира': 'квартира',
}

# Имена литературных героев — Capitalize
HEROES = {
    'марпл': 'Марпл',
    'шерлок_холмс': 'Шерлок_Холмс',
    'пуаро': 'Пуаро',
    'джеймс_бонд': 'Джеймс_Бонд',
    'дон_кихот': 'Дон_Кихот',
    'робинзон_крузо': 'Робинзон_Крузо',
    'гулливер': 'Гулливер',
    'карлсон': 'Карлсон',
    'буратино': 'Буратино',
    'маугли': 'Маугли',
    'незнайка': 'Незнайка',
}

# Римские века — UPPERCASE
ROMAN_CENTURIES = {
    'i_век', 'ii_век', 'iii_век', 'iv_век', 'v_век',
    'vi_век', 'vii_век', 'viii_век', 'ix_век', 'x_век',
    'xi_век', 'xii_век', 'xiii_век', 'xiv_век', 'xv_век',
    'xvi_век', 'xvii_век', 'xviii_век', 'xix_век', 'xx_век',
    # разные формы написания
    'xixв', 'xviiiв', 'xviiв', 'xviв', 'xvв', 'xivв', 'xiiiв', 'xxв',
    'xix_в', 'xviii_в',
}

# Правильно писать так
ROMAN_FIX = {
    'xixв': 'XIX_век',
    'xviiiв': 'XVIII_век',
    'xviiв': 'XVII_век',
    'xviв': 'XVI_век',
    'xvв': 'XV_век',
    'xivв': 'XIV_век',
    'xiiiв': 'XIII_век',
    'xxв': 'XX_век',
    'xix_век': 'XIX_век',
    'xviii_век': 'XVIII_век',
    'xvii_век': 'XVII_век',
    'xvi_век': 'XVI_век',
    'xv_век': 'XV_век',
    'xiv_век': 'XIV_век',
    'xiii_век': 'XIII_век',
    'xx_век': 'XX_век',
    'xii_век': 'XII_век',
    'xi_век': 'XI_век',
    'x_век': 'X_век',
    'ix_век': 'IX_век',
    'viii_век': 'VIII_век',
    'vii_век': 'VII_век',
    'vi_век': 'VI_век',
    'v_век': 'V_век',
    'iv_век': 'IV_век',
    'iii_век': 'III_век',
    'ii_век': 'II_век',
    'i_век': 'I_век',
}


def norm_base(s):
    """Привести к базовой форме: lowercase, пробелы → _, без знаков."""
    s = s.strip().lower()
    s = s.replace(' ', '_')
    s = re.sub(r'[^\wа-яё_]', '', s)
    s = re.sub(r'_+', '_', s)
    s = s.strip('_')
    return s


def normalize_tag(s):
    """Нормализовать тег с учётом типа."""
    base = norm_base(s)

    # Опечатка?
    if base in FIXES:
        base = FIXES[base]

    # Римский век?
    if base in ROMAN_FIX:
        return ROMAN_FIX[base]

    # Имя героя?
    if base in HEROES:
        return HEROES[base]

    # Всё остальное — lowercase
    return base


def process_list(lst):
    """Нормализовать список, убрать дубликаты, сохранить порядок."""
    if not isinstance(lst, list):
        return lst
    result = []
    seen = set()
    for item in lst:
        if not isinstance(item, str):
            continue
        n = normalize_tag(item)
        if n and n not in seen:
            seen.add(n)
            result.append(n)
    return result


def main():
    dry = '--dry' in sys.argv
    data = json.loads(OVERRIDES.read_text(encoding='utf-8'))
    changes = []

    for key, fields in data.items():
        if not isinstance(fields, dict):
            continue
        for field in ('genre', 'tags'):
            if field in fields:
                old = fields[field]
                new = process_list(old)
                if old != new:
                    changes.append((key, field, old, new))
                    fields[field] = new

    print(f'📝 Изменений: {len(changes)}')
    for key, field, old, new in changes[:20]:
        print(f'  {key[:50]}.{field}:')
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
