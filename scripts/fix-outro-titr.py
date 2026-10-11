#!/usr/bin/env python3
"""
Проставляет номер перед последним «титр» в .m3u, если его нет.
Без номера scan.js даёт «титр (завершение)» ключ [0,0] — и он улетает
в начало плейлиста, к вступлению. Любая цифра ≥ 1 → ключ [2,N] (в конец).

Использование:
    python3 scripts/fix-outro-titr.py --dry      # только посмотреть
    python3 scripts/fix-outro-titr.py --apply    # применить
"""

import re
import sys
from pathlib import Path

RADIO_DIR = Path.home() / 'Music/Music/Radio'
TITR_RE = re.compile(r'титр', re.I)
PART_NUM_RE = re.compile(r'(\d+)\s*час', re.I)


def process_file(path):
    text = path.read_text(encoding='utf-8')
    lines = text.split('\n')

    titr_idx = [i for i, ln in enumerate(lines)
                if ln.startswith('#EXTINF') and TITR_RE.search(ln)]

    if len(titr_idx) != 2:
        return None

    last_idx = titr_idx[-1]
    last_line = lines[last_idx]

    comma = last_line.find(',')
    if comma < 0:
        return None

    title = last_line[comma + 1:]
    m = TITR_RE.search(title)
    if not m:
        return None

    before = title[:m.start()]
    if re.search(r'\d', before):
        return None  # уже с номером

    # Собираем номера частей (не титров)
    part_nums = []
    for ln in lines:
        if not ln.startswith('#EXTINF') or TITR_RE.search(ln):
            continue
        c = ln.find(',')
        if c < 0:
            continue
        mm = PART_NUM_RE.search(ln[c + 1:])
        if mm:
            part_nums.append(int(mm.group(1)))

    n = max(part_nums) + 1 if part_nums else 1

    # Вставляем «N » прямо перед «титр», не меняя регистр и остальной текст
    pos = m.start()
    new_title = title[:pos] + f'{n} ' + title[pos:]
    new_line = last_line[:comma + 1] + new_title
    lines[last_idx] = new_line

    return {
        'path': path,
        'old': last_line,
        'new': new_line,
        'text': '\n'.join(lines),
    }


def main():
    apply = '--apply' in sys.argv

    files = sorted(RADIO_DIR.glob('*.m3u'))
    changes = []

    for f in files:
        try:
            r = process_file(f)
            if r:
                changes.append(r)
        except Exception as e:
            print(f'⚠️  {f.name}: {e}')

    print(f'📝 Нужно поправить: {len(changes)} файл(ов)\n')
    for c in changes:
        print(f'  {c["path"].name}')
        print(f'    было:  {c["old"].strip()}')
        print(f'    стало: {c["new"].strip()}')
        print()

    if not apply:
        print('➡️  Это dry-run, ничего не изменено.')
        print('   Запусти с --apply, чтобы применить.')
        return

    for c in changes:
        c['path'].write_text(c['text'], encoding='utf-8')

    print(f'💾 Изменено файлов: {len(changes)}')


if __name__ == '__main__':
    main()
