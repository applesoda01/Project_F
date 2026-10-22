#!/usr/bin/env python3
"""data/*.csv → prototype/js/data_gen.js (게임·시뮬레이터가 함께 읽는 데이터 파일)

    python tools/data_build.py          # 검사 후 생성
    python tools/data_build.py --check  # 검사만 (파일을 만들지 않음)

검사에서 오류가 하나라도 나오면 파일을 만들지 않고 종료 코드 1로 끝난다.
CSV는 엑셀·구글 시트에서 'CSV UTF-8'로 저장한다."""
import csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(ROOT, 'prototype', 'js', 'data_gen.js')
SCHEMA = json.load(open(os.path.join(ROOT, 'tools', 'balance_schema.json'), encoding='utf-8'))

GRADES = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
STATS = ['힘', '민첩', '지력', '정신', '기교']
FACES = ['smile', 'serious', 'laugh', 'worried', 'awkward', 'surprised']
EVENTS = ['accept', 'depart', 'success', 'fail', 'levelup', 'gradeup', 'meal', 'drink', 'first', 'chat']
TONES = ['bold', 'careful', 'friendly', 'loner', 'plain']
LINA_EVENTS = ['lina_meal', 'lina_drink', 'lina_depart', 'lina_first', 'lina_success', 'lina_fail', 'lina_ledger', 'lina_unlock', 'lina_idle']
# 장면별로 쓸 수 있는 {변수}
SCENES = {'start': [], 'newgame': [], 'load': ['date'], 'gradeup': ['grade'],
          'promo_ready': ['name'], 'promo_held': ['name'], 'promo_accepted': ['name', 'cls'], 'promo_declined': ['name'],
          'monthly_deficit': ['loss', 'quests', 'success'], 'monthly_good': ['net', 'quests', 'success', 'rate'],
          'monthly_meal': ['meal'], 'monthly_low': ['rate', 'net'], 'monthly_normal': ['net', 'quests', 'success', 'advs']}

errors = []
def err(f, line, msg): errors.append(f'{f} {line}행: {msg}')

def read(name, cols):
    path = os.path.join(DATA, name)
    with open(path, encoding='utf-8-sig', newline='') as fp:
        rows = list(csv.reader(fp))
    if not rows or [c.strip() for c in rows[0][:len(cols)]] != cols:
        err(name, 1, f'첫 줄(열 이름)이 {",".join(cols)} 이어야 합니다'); return []
    out = []
    for i, r in enumerate(rows[1:], start=2):
        if not any(c.strip() for c in r): continue          # 빈 줄은 건너뜀
        r = (r + [''] * len(cols))[:len(cols)]
        out.append((i, {c: v.strip() for c, v in zip(cols, r)}))
    return out

def num(s):
    v = float(s)
    return int(v) if v == int(v) and '.' not in s else v

# ---------- 밸런스 ----------
balance, seen = {}, set()
for ln, r in read('balance.csv', ['구분', '항목', '값', '설명']):
    key = f"{r['구분']}.{r['항목']}"
    if key not in SCHEMA: err('balance.csv', ln, f'알 수 없는 항목 {key} (새 항목은 프로그래머가 코드와 함께 추가합니다)'); continue
    if key in seen: err('balance.csv', ln, f'{key} 가 두 번 나옵니다'); continue
    seen.add(key)
    try:
        parts = [num(x.strip()) for x in r['값'].split('|')]
    except ValueError:
        err('balance.csv', ln, f"{key} 값 '{r['값']}' 에 숫자가 아닌 것이 있습니다"); continue
    n = SCHEMA[key]
    if n == 0:
        if len(parts) != 1: err('balance.csv', ln, f'{key} 는 숫자 하나여야 합니다'); continue
        val = parts[0]
    else:
        if len(parts) != n: err('balance.csv', ln, f'{key} 는 값이 {n}개여야 합니다 (지금 {len(parts)}개, | 로 구분)'); continue
        val = parts
    if any(x < 0 for x in (parts)): err('balance.csv', ln, f'{key} 에 음수가 있습니다')
    sec, k = key.split('.', 1); balance.setdefault(sec, {})[k] = val
for key in SCHEMA:
    if key not in seen: err('balance.csv', '-', f'{key} 항목이 빠졌습니다')

# ---------- 의뢰 종류 ----------
qrows = read('quest_types.csv', ['번호', '이름', '설명'])
qtypes = [r['이름'] for _, r in qrows]
if len(qtypes) != 5: err('quest_types.csv', '-', f'의뢰 종류는 5개여야 합니다 (지금 {len(qtypes)}개). 종류 추가는 규칙 변경이라 프로그래머와 함께 합니다')
for ln, r in qrows:
    if not r['이름']: err('quest_types.csv', ln, '이름이 비었습니다')

# ---------- 이름 ----------
names = [r['이름'] for _, r in read('names.csv', ['이름']) if r['이름']]
if len(names) < 20: err('names.csv', '-', '모험가 이름은 20개 이상 필요합니다')
dup = {n for n in names if names.count(n) > 1}
if dup: err('names.csv', '-', f'겹치는 이름: {", ".join(sorted(dup))}')

# ---------- 요리·스킬 ----------
meals = []
for ln, r in read('meals.csv', ['등급', '요리', '재료', '효과']):
    if r['등급'] not in GRADES: err('meals.csv', ln, f"등급 '{r['등급']}' 은 F E D C B A S 중 하나여야 합니다")
    if not r['요리']: err('meals.csv', ln, '요리 이름이 비었습니다')
    meals.append({'grade': r['등급'], 'name': r['요리'], 'ingredient': r['재료'], 'effect': r['효과']})
skills = []
for ln, r in read('skills.csv', ['계열', '단계', '직업', '스킬', '종류', '효과']):
    if r['계열'] not in STATS: err('skills.csv', ln, f"계열 '{r['계열']}' 은 {' '.join(STATS)} 중 하나여야 합니다")
    skills.append({'line': r['계열'], 'stage': r['단계'], 'class': r['직업'], 'name': r['스킬'], 'type': r['종류'], 'effect': r['효과']})

# ---------- 말풍선 ----------
speech = {'L': {e: {t: [] for t in TONES} for e in EVENTS}, 'rumor': [], 'lina': {e: [] for e in LINA_EVENTS}}
for ln, r in read('speech.csv', ['상황', '말투', '대사', '메모']):
    e, t, line = r['상황'], r['말투'], r['대사']
    if not line: err('speech.csv', ln, '대사가 비었습니다'); continue
    if e == 'rumor': speech['rumor'].append(line)
    elif e in LINA_EVENTS: speech['lina'][e].append(line)
    elif e in EVENTS:
        if t not in TONES: err('speech.csv', ln, f"말투 '{t}' 는 {' '.join(TONES)} 중 하나여야 합니다"); continue
        speech['L'][e][t].append(line)
    else: err('speech.csv', ln, f"상황 '{e}' 을 모릅니다 ({' '.join(EVENTS + ['rumor'] + LINA_EVENTS)})")
for e in EVENTS:
    if not speech['L'][e]['plain']: err('speech.csv', '-', f'{e} 상황에 보통(plain) 말투 대사가 하나도 없습니다')
for e in LINA_EVENTS:
    if not speech['lina'][e]: err('speech.csv', '-', f'{e} 리나 대사가 하나도 없습니다')

# ---------- 대화 장면 ----------
dialog = {}
for ln, r in read('dialog.csv', ['장면', '순서', '표정', '대사', '메모']):
    sc = r['장면']
    if sc not in SCENES: err('dialog.csv', ln, f"장면 '{sc}' 을 모릅니다 ({' '.join(SCENES)})"); continue
    if r['표정'] not in FACES: err('dialog.csv', ln, f"표정 '{r['표정']}' 은 {' '.join(FACES)} 중 하나여야 합니다")
    for v in re.findall(r'\{(\w+)\}', r['대사']):
        if v not in SCENES[sc]: err('dialog.csv', ln, f"{sc} 장면에서는 {{{v}}} 를 쓸 수 없습니다 (쓸 수 있는 것: {', '.join(SCENES[sc]) or '없음'})")
    try: order = float(r['순서'])
    except ValueError: err('dialog.csv', ln, '순서는 숫자여야 합니다'); continue
    dialog.setdefault(sc, []).append((order, {'face': r['표정'], 'text': r['대사']}))
for sc in SCENES:
    if sc not in dialog: err('dialog.csv', '-', f'{sc} 장면 대사가 없습니다')
dialog = {k: [x for _, x in sorted(v, key=lambda t: t[0])] for k, v in dialog.items()}

# ---------- 결과 ----------
if errors:
    print(f'오류 {len(errors)}건 — 파일을 만들지 않았습니다.')
    for e in errors: print('  -', e)
    sys.exit(1)
data = {'balance': balance, 'questTypes': qtypes, 'names': names, 'meals': meals, 'skills': skills, 'speech': speech, 'dialog': dialog}
print(f'검사 통과: 밸런스 {len(seen)}항목, 의뢰 종류 {len(qtypes)}, 이름 {len(names)}, 요리 {len(meals)}, 스킬 {len(skills)}, '
      f'말풍선 {sum(len(x) for e in speech["L"].values() for x in e.values()) + len(speech["rumor"]) + sum(len(x) for x in speech["lina"].values())}줄, 대화 {sum(len(v) for v in dialog.values())}줄')
if '--check' in sys.argv: sys.exit(0)
body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
with open(OUT, 'w', encoding='utf-8', newline='\n') as fp:
    fp.write('/* 자동 생성 파일 — 직접 고치지 마세요.\n   data/*.csv 를 고친 뒤 `python tools/data_build.py` 로 다시 만듭니다. */\n')
    fp.write('(function (root) {\n  var D = ' + body + ';\n')
    fp.write("  if (typeof module !== 'undefined' && module.exports) module.exports = D;\n  if (root) root.GAME_DATA = D;\n")
    fp.write("})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));\n")
print('만듦:', os.path.relpath(OUT, ROOT))
