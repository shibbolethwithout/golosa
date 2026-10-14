#!/usr/bin/env python3
"""
Матчит sheba-clean.json с overrides.json.

Год НЕ участвует в матчинге. Только нормализованное название.
Дубликаты (одно название → много ключей) выносятся отдельно.

Итог: сколько ключей overrides получат actors/staff.
"""

import json
import re
from pathlib import Path
from collections import defaultdict

SHEBA = Path('scripts/sheba-clean.json')
OVERRIDES = Path('scripts/overrides.json')
OUT = Path('scripts/sheba-matches.json')

MIN_LEN = 6


def normalize(s):
    if not s:
        return ''
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'[^а-яa-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def strip_year(key):
    """Убирает завершающий ', ГГГГ' (или ' ГГГГ') только если это похоже на год."""
    m = re.search(r'[,\s]+(\d{4})\s*$', key)
    if m:
        y = int(m.group(1))
        if 1900 <= y <= 2029:
            return key[:m.start()].strip()
    return key.strip()


def main():
    sheba = json.loads(SHEBA.read_text(encoding='utf-8'))
    overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))

    # Готовим ключи overrides
    keys = list(overrides.keys())
    keys_norm = {k: normalize(strip_year(k)) for k in keys}
    # Обратный индекс: нормализованное название → список ключей
    norm_to_keys = defaultdict(list)
    for k in keys:
        norm_to_keys[keys_norm[k]].append(k)

    matched = {}          # key → sheba-entry (лучший матч)
    conflict = defaultdict(list)   # key → [sheba-entries] (несколько sheba на один ключ)
    multi_key = []        # sheba-entry с несколькими кандидатами
    unmatched = []        # sheba-entry без пары

    for entry in sheba:
        t_norm = normalize(entry['title'])
        if len(t_norm) < 3:
            unmatched.append(entry)
            continue

        candidates = set()

        # Точное совпадение нормализованной строки
        for k in norm_to_keys.get(t_norm, []):
            candidates.add(k)

        # Подстрока: sheba-title внутри key или наоборот
        if not candidates and len(t_norm) >= MIN_LEN:
            for k in keys:
                kn = keys_norm[k]
                if not kn:
                    continue
                if t_norm in kn or (len(kn) >= MIN_LEN and kn in t_norm):
                    candidates.add(k)

        candidates = list(candidates)

        if len(candidates) == 0:
            unmatched.append(entry)
        elif len(candidates) == 1:
            k = candidates[0]
            if k in matched:
                # уже был матч для этого ключа → конфликт
                conflict[k].append(entry)
                # оставляем первый, второй идёт в conflict
            else:
                matched[k] = entry
        else:
            multi_key.append({
                'sheba_title': entry['title'],
                'sheba_year': entry['year'],
                'candidates': candidates,
            })

    # Ключи, для которых не нашлось пары
    covered_keys = set(matched.keys())
    uncovered_keys = [k for k in keys if k not in covered_keys]

    # Сколько actors и staff суммарно
    total_actors = sum(len(e['actors']) for e in matched.values())
    total_staff = sum(len(e['staff']) for e in matched.values())
    # + те, что в multi_key потенциально
    multi_key_actors = sum(len(e['actors']) for e in sheba if any(
        e is mk_entry for mk_entry in []))
    # (посчитаем ниже честно)

    # Пересчёт с учётом multi_key — считаем сколько уникальных записей покрыто
    all_matched_entries = list(matched.values())
    multi_key_entries = []
    for mk in multi_key:
        # находим исходный sheba-entry по title+year
        for e in sheba:
            if e['title'] == mk['sheba_title'] and e['year'] == mk['sheba_year']:
                multi_key_entries.append(e)
                break

    total_actors = sum(len(e['actors']) for e in matched.values())
    total_staff = sum(len(e['staff']) for e in matched.values())

    OUT.write_text(json.dumps({
        'summary': {
            'sheba_total': len(sheba),
            'overrides_total': len(keys),
            'matched_keys': len(matched),
            'uncovered_keys': len(uncovered_keys),
            'multi_key_sheba': len(multi_key),
            'unmatched_sheba': len(unmatched),
            'conflict_keys': len(conflict),
            'coverage_pct': round(len(matched) / len(keys) * 100, 1) if keys else 0,
            'total_actors_in_matched': total_actors,
            'total_staff_in_matched': total_staff,
        },
        'matched': [
            {
                'key': k,
                'sheba_title': e['title'],
                'sheba_year': e['year'],
                'sheba_url': e.get('url', ''),
                'actors_count': len(e['actors']),
                'staff_count': len(e['staff']),
            }
            for k, e in sorted(matched.items())
        ],
        'conflict_keys': {
            k: [{'title': e['title'], 'year': e['year'], 'url': e.get('url', '')} for e in v]
            for k, v in conflict.items()
        },
        'multi_key': multi_key,
        'unmatched': [
            {'title': e['title'], 'year': e['year'], 'url': e.get('url', '')}
            for e in unmatched
        ],
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    print('=' * 60)
    print('РЕЗУЛЬТАТ МАТЧИНГА')
    print('=' * 60)
    print(f'📁 sheba-записей:                {len(sheba)}')
    print(f'📁 overrides-спектаклей:         {len(keys)}')
    print()
    print(f'✅ Совпало однозначно:           {len(matched)}  ← эти получат актёров')
    print(f'⚠️  Дубли (одно название, разные спектакли): {len(multi_key)}')
    print(f'⚠️  Конфликты (2+ sheba на ключ): {len(conflict)}')
    print(f'❌ Без пары:                     {len(unmatched)}')
    print()
    print(f'📊 ПОКРЫТИЕ: {len(matched)} из {len(keys)} = '
          f'{round(len(matched) / len(keys) * 100, 1) if keys else 0}%')
    print(f'🎭 В покрытых спектаклях:')
    print(f'   актёров:  {total_actors}')
    print(f'   staff:    {total_staff}')
    print()
    print(f'💾 {OUT}')
    print('=' * 60)

    # Дубликаты - самое важное
    if multi_key:
        print()
        print('🔁 ДУБЛИКАТЫ (одно название sheba → несколько ключей overrides):')
        print('─' * 60)
        for mk in multi_key:
            print(f'  «{mk["sheba_title"]}»  [{mk["sheba_year"] or "—"}]')
            for c in mk['candidates']:
                print(f'     → {c}')
            print()

    # Конфликты: 2+ sheba на один ключ
    if conflict:
        print()
        print('⚠️  КОНФЛИКТЫ (2+ sheba-записи на один ключ):')
        print('─' * 60)
        for k, entries in conflict.items():
            print(f'  {k}')
            for e in entries:
                print(f'     + {e["title"]} ({e["year"] or "—"})')
            print()


if __name__ == '__main__':
    main()
