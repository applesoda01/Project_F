#!/usr/bin/env python3
"""data/*.csv + data/collegium_data.json → prototype/js/data_gen.js (게임·시뮬레이터가 함께 읽는 데이터 파일)

    python prototype/tools/data_build.py          # 검사 후 생성
    python prototype/tools/data_build.py --check  # 검사만 (파일을 만들지 않음)

검사에서 오류가 하나라도 나오면 파일을 만들지 않고 종료 코드 1로 끝난다. 경고는 알려 주기만 한다.
collegium_data.json 은 소재 편집기(tools/material_editor)가 저장하는 파일이다. 없으면 건너뛴다.
CSV는 엑셀·구글 시트에서 'CSV UTF-8'로 저장한다."""
import csv, json, math, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(ROOT, 'js', 'data_gen.js')
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

errors, warns = [], []
def err(f, line, msg): errors.append(f'{f} {line}행: {msg}')
def cerr(where, msg): errors.append(f'collegium_data.json {where}: {msg}')
def cwarn(where, msg): warns.append(f'collegium_data.json {where}: {msg}')

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


# ---------- 편집기 데이터 (collegium_data.json) ----------
# 자동값 계산은 편집기(tools/material_editor)의 durCalc·questFinal 과 같은 식이다. 한쪽을 바꾸면 다른 쪽도 맞춘다.
QTYPE_KEYS = ['slay', 'hunt', 'study', 'guard', 'mine']           # quest_types.csv 순서와 같음
MAT_LINES = QTYPE_KEYS + ['food', 'restore', 'etc']
QCATS = ['req', 'main', 'sub', 'promo', 'res']
GEAR_TYPES = {'sword': 'weapon', 'bow': 'weapon', 'staff': 'weapon', 'mace': 'weapon', 'dagger': 'weapon', 'heavy': 'armor', 'light': 'armor', 'robe': 'armor',
              'ring': 'acc', 'anklet': 'acc', 'necklace': 'acc', 'rosary': 'acc', 'gloves': 'acc'}
REGIONS = ['forest', 'grass', 'desert', 'town']
TALK_KEYS = ['appear', 'accept', 'hold', 'success', 'fail']
ROLES = ['주', '부', '복원', '기타']
TRUST_S, TRUST_F = balance['quest'].get('trustSucc', 1), balance['quest'].get('trustFail', 2)   # 2026-11-12: balance.csv quest.trustSucc·trustFail (예전 코드 고정값 0.3·0.6)
hround = lambda x, nd=0: math.floor(x * 10 ** nd + 0.5) / 10 ** nd if nd else int(math.floor(x + 0.5))   # JS Math.round 와 같은 반올림

def dur_calc(rules, gi, d, n=None):
    Q = balance.get('quest', {})
    bw = Q['weeks'][gi]; w = bw + d
    if w < 1: return None
    reward = Q['reward'][gi] * rules['rMul'] ** d; capped = False
    if rules['cap'] and d > 0 and gi < 6:
        lim = Q['reward'][gi + 1] / Q['weeks'][gi + 1] * w
        if reward > lim: reward, capped = lim, True
    return {'weeks': w, 'reward': hround(reward), 'capped': capped,
            'ref': hround(Q['ref'][gi] * (1 + rules['refPct'] / 100 * d), 1),
            'death': 1 - (1 - Q['deathBase'][gi]) ** (w / bw),
            'mon': None if n is None else max(1, hround(n * rules['mMul'] ** d))}

content = None
CPATH = os.path.join(DATA, 'collegium_data.json')
if os.path.exists(CPATH) and not errors:          # 밸런스에 오류가 있으면 계산을 못 하므로 건너뜀
    try:
        cd = json.load(open(CPATH, encoding='utf-8'))
    except ValueError as e:
        cerr('-', f'JSON 형식이 깨졌습니다 ({e})'); cd = None
    if cd is not None and (cd.get('format') != 'collegium-data' or cd.get('version') != 3):
        cerr('-', 'format "collegium-data", version 3 파일이 아닙니다. 소재 편집기에서 다시 저장하세요'); cd = None
    if cd is not None:
        R = {'rMul': 2, 'mMul': 1.5, 'refPct': 5, 'dMin': -1, 'dMax': 2, 'cap': True}; R.update(cd.get('rules') or {})
        if R['rMul'] < 1 or R['mMul'] < 1 or R['refPct'] < 0: cerr('rules', '배수는 1 이상, 기준치 증가는 0 이상이어야 합니다')
        if R['dMin'] > 0 or R['dMax'] < 0: cerr('rules', '기간 줄이기 한도는 0 이하, 늘리기 한도는 0 이상이어야 합니다')
        mats, items, quests = cd.get('materials', []), cd.get('items', []), cd.get('quests', [])
        ENH = cd.get('enhance') or [4, 8, 13, 20, 28, 39, 53, 70, 88, 110]     # 강화 누적 상승률(%) +1~+10
        if len(ENH) != 10 or any(not isinstance(x, int) or x < 0 for x in ENH) or any(ENH[i] < ENH[i - 1] for i in range(1, 10)):
            cerr('enhance', '강화 곡선은 0 이상 정수 10개, 앞 단계보다 작지 않아야 합니다')
        def uniq(lst, label):
            ids = [x.get('id') for x in lst]
            for i in sorted({i for i in ids if ids.count(i) > 1}): cerr(label, f'id {i} 가 두 번 이상 나옵니다')
            return set(ids)
        mat_ids, qids = uniq(mats, 'materials'), uniq(quests, 'quests'); uniq(items, 'items')
        mons = cd.get('monsters', []); mon_ids = uniq(mons, 'monsters'); MON = {m.get('id'): m for m in mons}
        for m in mons:
            w = f"몬스터 {m.get('id')}({m.get('name')})"
            if not m.get('name'): cerr(w, '이름이 비었습니다')
            if m.get('grade') not in GRADES: cerr(w, '처음 등장 등급이 잘못되었습니다')
            for k in ('hp', 'atk', 'def', 'scale'):
                if k == 'def' and k not in m: m[k] = 0
                if not isinstance(m.get(k), int) or m.get(k) < 0: cerr(w, f'{k} 값 {m.get(k)} 는 0 이상 정수여야 합니다')
            if m.get('hp') == 0: cerr(w, '체력이 0입니다')
            for d in m.get('drops', []):
                if d not in mat_ids: cerr(w, f'떨어뜨리는 소재 {d} 가 소재 목록에 없습니다')
        for m in mats:
            w = f"소재 {m.get('id')}({m.get('name')})"
            if m.get('grade') not in GRADES: cerr(w, f"등급 '{m.get('grade')}' 이 잘못되었습니다")
            if m.get('line') not in MAT_LINES: cerr(w, f"계열 '{m.get('line')}' 을 모릅니다")
            if not m.get('name'): cerr(w, '이름이 비었습니다')
        food_keys = {}
        reward_mats = {r.get('m') for q in (cd.get('quests') or []) for r in (q.get('rewards') or [])}
        for it in items:
            w = f"{it.get('kind')} {it.get('id')}({it.get('name')})"
            if it.get('kind') not in ('food', 'gear', 'potion'): cerr(w, '종류는 food·gear·potion 중 하나여야 합니다')
            if it.get('grade') not in GRADES: cerr(w, '등급이 잘못되었습니다')
            for r in it.get('recipe', []):
                if r.get('m') and r['m'] not in mat_ids: cerr(w, f"조합법 재료 {r['m']} 이 소재 목록에 없습니다")
            if not it.get('recipe'): cwarn(w, '조합법이 없습니다')
            if it.get('kind') == 'food':   # 요리 규칙: 소재 각 1개, 1~3종, 다른 요리와 조합 중복 금지 (docs/design/cooking.md)
                ms = [r.get('m') for r in it.get('recipe', []) if r.get('m')]
                if len(ms) != len(set(ms)): cerr(w, '같은 소재가 두 번 들어 있습니다 (요리는 소재 각 1개)')
                if len(ms) > 3: cerr(w, '요리 재료는 최대 3종입니다')
                if any(int(r.get('n', 1)) != 1 for r in it.get('recipe', [])): cwarn(w, '요리 재료 수량은 1로 계산됩니다')
                key = '+'.join(sorted(ms))
                if key and key in food_keys: cerr(w, f'{food_keys[key]} 과 조합법이 같습니다')
                food_keys[key] = it.get('name')
                for m in ms:
                    if m in mat_ids and m not in reward_mats: cwarn(w, f'재료 {m} 을 주는 퀘스트가 없습니다')
                d = it.get('desc') or ''
                if d and not re.search(r'\d+(?:\.\d+)?\s*%', d): cwarn(w, f"효과 '{d}' 를 해석할 수 없습니다 ('능력치 +n%' 꼴, 수치 없는 효과는 발견 수 보너스만)")
            if it.get('kind') == 'gear':
                if it.get('gtype') not in GEAR_TYPES: cerr(w, f"장비 종류 '{it.get('gtype')}' 를 모릅니다 (편집기에서 종류를 고르세요)")
                for k, v in (it.get('stats') or {}).items():
                    if str(k) not in '01234' or not isinstance(v, int) or v < 0: cerr(w, f'판정 능력치 {k}:{v} 가 잘못되었습니다 (0~4 번호, 0 이상 정수)')
                for k in ('atk', 'def', 'mdef', 'hp', 'mp', 'luck', 'price'):
                    v = it.get(k, 0)
                    if not isinstance(v, int) or v < 0: cerr(w, f'{k} 값 {v} 는 0 이상 정수여야 합니다')
        for t in QTYPE_KEYS:
            for g in GRADES:
                if f'q_{t}_{g}' not in qids: cerr('quests', f'기본 의뢰 q_{t}_{g} 이 없습니다 (35칸은 지울 수 없음)')
        byid = {q.get('id'): q for q in quests}
        out_q = []
        for q in quests:
            qid = q.get('id'); w = f"퀘스트 {qid}({q.get('name')})"
            if q.get('grade') not in GRADES: cerr(w, '등급이 잘못되었습니다'); continue
            gi = GRADES.index(q['grade'])
            if q.get('cat') not in QCATS: cerr(w, f"분류 '{q.get('cat')}' 을 모릅니다")
            if q.get('line') and q['line'] not in QTYPE_KEYS: cerr(w, f"유형 '{q['line']}' 을 모릅니다")
            if not q.get('name'): cerr(w, '이름이 비었습니다')
            board = q.get('core') or q.get('cat') in ('req', 'res')
            on_board = bool(q.get('core')) or (q.get('cat') == 'res' and q.get('line') in QTYPE_KEYS)   # 게시판 후보 (같은 칸 중 무작위)
            if q.get('cat') == 'res' and not q.get('core') and not on_board: cwarn(w, '분류가 리소스인데 유형이 없어 게시판에 나오지 않습니다')
            # 보상 소재
            rw = q.get('rewards', [])
            for r in rw:
                if not r.get('m'): cwarn(w, '소재를 고르지 않은 보상이 있습니다 (무시됨)')
                elif r['m'] not in mat_ids: cerr(w, f"보상 소재 {r['m']} 이 소재 목록에 없습니다")
                if not (0 <= float(r.get('p', 0)) <= 100): cerr(w, '보상 확률은 0~100 이어야 합니다')
                if r.get('role') not in ROLES: cerr(w, f"보상 구분 '{r.get('role')}' 을 모릅니다")
            ms = [r['m'] for r in rw if r.get('m')]
            if len(ms) != len(set(ms)): cerr(w, '같은 보상 소재가 두 줄 이상 있습니다')
            if not ms: cwarn(w, '보상 소재가 없습니다')
            # 미니 뷰
            v = q.get('view') or {}; d = v.get('delta', 0)
            if v.get('region') and v['region'] not in REGIONS: cerr(w, f"배경 지역 '{v['region']}' 을 모릅니다")
            if not (R['dMin'] <= d <= R['dMax']): cwarn(w, f'기간 변화 {d}주가 계수의 한도({R["dMin"]}~{R["dMax"]})를 벗어납니다')
            c = dur_calc(R, gi, d)
            if c is None: cerr(w, f'소요 기간이 1주보다 짧아집니다 (기간 변화 {d})'); continue
            ens = v.get('enemies', [])
            if len(ens) > 3: cerr(w, '적은 최대 3줄입니다')
            for i, e in enumerate(ens, 1):
                if e.get('mon'):
                    if e['mon'] not in MON: cerr(w, f"적 {i}번 몬스터 {e['mon']} 이 몬스터 목록에 없습니다")
                    elif GRADES.index(MON[e['mon']].get('grade', 'F')) > gi: cwarn(w, f"적 {i}번 {MON[e['mon']].get('name')} 은 {MON[e['mon']].get('grade')}급 몬스터인데 더 낮은 등급 퀘스트에 나옵니다")
                elif not e.get('name'): cerr(w, f'적 {i}번 몬스터를 고르지 않았습니다')
                if int(e.get('count', 0)) < 1: cerr(w, f'적 {i}번 수는 1 이상이어야 합니다')
            # 판정·보상 (null = 자동값)
            j = q.get('judge') or {}
            auto = {'ref': hround(c['ref'] * (balance['quest']['bossMult'] if j.get('boss') else 1), 1), 'death': c['death'], 'reward': c['reward'],
                    'fameS': balance['fame']['succ'][gi], 'fameF': balance['fame']['fail'][gi], 'trustS': TRUST_S, 'trustF': TRUST_F}
            fin, over = {}, []
            for k, a in auto.items():
                x = j.get(k)
                if x is None or x == '': fin[k] = a
                else:
                    try: x = float(x)
                    except (TypeError, ValueError): cerr(w, f'{k} 직접 입력값이 숫자가 아닙니다'); x = a
                    if x < 0: cerr(w, f'{k} 직접 입력값이 음수입니다')
                    if k == 'death' and x > 1: cerr(w, '사망률 직접 입력값이 100%를 넘습니다')
                    fin[k] = x; over.append(k)
            stats = None
            if j.get('smode') == 'manual' and j.get('stats'):
                stats = sorted(set(int(k) for k in j['stats']))
                if any(k < 0 or k > 4 for k in stats): cerr(w, '요구 능력치 번호는 0~4 (힘·민첩·지력·정신·기교) 이어야 합니다')
                ti = QTYPE_KEYS.index(q['line']) if q.get('line') in QTYPE_KEYS else -1
                if ti >= 0 and ti not in stats: cwarn(w, f'유형 대표 능력치({STATS[ti]})가 요구 능력치에 없습니다')
            # 등장 조건
            cnd = q.get('cond') or {}
            if not board:
                if cnd.get('minGrade') and cnd['minGrade'] not in GRADES: cerr(w, '길드 등급 조건이 잘못되었습니다')
                for p in cnd.get('prereq', []):
                    if p not in byid: cerr(w, f'선행 퀘스트 {p} 이 없습니다')
                    elif byid[p].get('core'): cerr(w, f'기본 의뢰 {p} 는 선행 퀘스트가 될 수 없습니다 (반복 의뢰)')
                seen_l, stack = set(), list(cnd.get('prereq', []))
                while stack:
                    p = stack.pop()
                    if p == qid: cerr(w, '선행 퀘스트가 돌고 돌아 자기 자신으로 옵니다 (영원히 등장하지 않음)'); break
                    if p in seen_l or p not in byid: continue
                    seen_l.add(p); stack += (byid[p].get('cond') or {}).get('prereq', [])
                if q.get('cat') == 'sub' and cnd.get('hidden') and not cnd.get('rumor'): cwarn(w, '히든 서브인데 소문 문구가 비었습니다')
            # 대사
            tk = q.get('talk') or {}
            for k in TALK_KEYS:
                t = tk.get(k) or {}
                if t.get('mode') == 'line':
                    if t.get('face') not in FACES: cerr(w, f'{k} 대사 표정이 잘못되었습니다')
                    if not t.get('text'): cwarn(w, f'{k} 한 줄 대사가 비었습니다')
                    elif len(t['text']) > 90: cwarn(w, f'{k} 대사가 90자를 넘습니다')
                elif t.get('mode') == 'scene' and not t.get('scene'): cwarn(w, f'{k} 대화씬 ID가 비었습니다')
            out_q.append({'id': qid, 'name': q.get('name', ''), 'cat': q.get('cat'), 'grade': q['grade'], 'type': QTYPE_KEYS.index(q['line']) if q.get('line') in QTYPE_KEYS else -1,
                          'core': bool(q.get('core')), 'board': on_board, 'client': q.get('client', ''), 'notice': q.get('notice', ''), 'tip': q.get('tip', ''),
                          'region': v.get('region') or '', 'weeks': c['weeks'], 'delta': d,
                          'enemies': [{'mon': e.get('mon', ''), 'name': MON.get(e.get('mon'), {}).get('name', e.get('name', '')),
                                       'count': (int(e.get('count', 1)) if e.get('boss') else dur_calc(R, gi, d, int(e.get('count', 1)))['mon']),
                                       'boss': bool(e.get('boss')), 'img': MON.get(e.get('mon'), {}).get('img', e.get('img', '')),
                                       'hp': MON.get(e.get('mon'), {}).get('hp', 0), 'atk': MON.get(e.get('mon'), {}).get('atk', 0), 'def': MON.get(e.get('mon'), {}).get('def', 0),
                                       'scale': MON.get(e.get('mon'), {}).get('scale', 100)} for e in ens],
                          'stats': stats, 'boss': bool(j.get('boss')), **{k: (round(x, 4) if isinstance(x, float) else x) for k, x in fin.items()}, 'override': over,
                          'cond': None if board else {'route': cnd.get('route', 'office'), 'minGrade': cnd.get('minGrade') or q['grade'], 'prereq': cnd.get('prereq', []),
                                                     'fame': cnd.get('fame'), 'trust': cnd.get('trust'), 'hidden': bool(cnd.get('hidden')), 'rumor': cnd.get('rumor', ''),
                                                     'near': cnd.get('near', ''), 'reappear': cnd.get('reappear', 8)},
                          'talk': {k: tk[k] for k in TALK_KEYS if (tk.get(k) or {}).get('mode') in ('line', 'scene')},
                          'rewards': [{'m': r['m'], 'role': r.get('role'), 'p': r.get('p')} for r in rw if r.get('m')]})
        # 공급처가 한 곳뿐인 부 소재 (경고, 식재료 제외)
        main_of = lambda q: next((r['m'] for r in q.get('rewards', []) if r.get('role') == '주' and r.get('m')), '')
        pool = [q for q in out_q if q['board']]
        # (2026-11-03) 같은 칸 주 소재 일치 경고는 없앰: 칸의 퀘스트끼리 서로의 주 소재를 부 소재로 주는 구조
        mains, subs = set(), {}
        mline = {m.get('id'): m.get('line') for m in mats}
        for q in pool:
            for r in q['rewards']:
                if r['role'] == '주': mains.add(r['m'])
                else: subs.setdefault(r['m'], []).append(q['id'])
        for m, ids in subs.items():
            if len(ids) == 1 and m not in mains and mline.get(m) != 'food': cwarn('quests', f'부 소재 {m} 은 게시판 퀘스트 {ids[0]} 한 곳에서만 나옵니다 (구하기 어려울 수 있음)')
        content = {'rules': R, 'materials': [{k: m.get(k) for k in ('id', 'name', 'grade', 'line', 'core', 'desc', 'icon')} for m in mats],
                   'items': [{**{k: it.get(k) for k in ('id', 'kind', 'name', 'grade', 'desc', 'tip', 'recipe', 'icon')},
                              **({'gtype': it.get('gtype'), 'slot': GEAR_TYPES.get(it.get('gtype'), ''), 'stats': {int(k): v for k, v in (it.get('stats') or {}).items()},
                                  **{k: it.get(k, 0) for k in ('atk', 'def', 'mdef', 'hp', 'mp', 'luck', 'price')}, 'effect': it.get('effect', '')} if it.get('kind') == 'gear' else {})}
                             for it in items],
                   'monsters': [{k: m.get(k) for k in ('id', 'name', 'grade', 'kind', 'hp', 'atk', 'def', 'img', 'scale', 'drops', 'desc', 'tip')} for m in mons],
                   'enhance': ENH,      # 강화 결과 = 기본값 + round(기본값 × enhance[n-1] / 100) (반올림, 편집기와 같음)
                   'quests': out_q}

# ---------- 결과 ----------
for w_ in warns: print('  경고:', w_)
if errors:
    print(f'오류 {len(errors)}건 — 파일을 만들지 않았습니다.')
    for e in errors: print('  -', e)
    sys.exit(1)
data = {'balance': balance, 'questTypes': qtypes, 'names': names, 'meals': meals, 'skills': skills, 'speech': speech, 'dialog': dialog}
if content is not None: data['content'] = content       # 편집기 데이터가 없으면 넣지 않음 (게임은 balance 값만 씀)
# 로비 배치 칸 (2026-11-12, tools/lobby_grid_editor.html 로 칠한 값). 없으면 게임은 모든 바닥 칸을 놓기 가능으로 봄
_lg = os.path.join(DATA, 'lobby_grid.json')
if os.path.exists(_lg):
    _g = json.load(open(_lg, encoding='utf-8-sig'))
    if len(_g.get('floor', [])) != 14 or any(len(r) != 14 for r in _g['floor']) or len(_g.get('wallL', [])) != 14 or len(_g.get('wallR', [])) != 14: print('  경고: lobby_grid.json 이 바닥 14×14·벽 14칸 형식이 아니라 넣지 않았습니다')
    else: data['lobbyGrid'] = {'floor': _g['floor'], 'wallL': _g['wallL'], 'wallR': _g['wallR']}
# 마을 민가 자리 (2026-11-13, tools/town_editor.html 로 배치한 data/town_houses.csv). [house_id, gx, gy, w, d, 등장 단계(1~5), 지붕색(0~3)]
_th = os.path.join(DATA, 'town_houses.csv')
if os.path.exists(_th):
    _rows = []
    for _r in csv.DictReader(open(_th, encoding='utf-8-sig')):
        try: _rows.append([int(_r['house_id']), int(_r['gx']), int(_r['gy']), int(_r['w']), int(_r['d']), int(_r['등장_단계']), int(_r.get('지붕색(0~3)') or 0)])
        except (KeyError, ValueError): print('  경고: town_houses.csv 의 한 줄을 읽지 못해 건너뜁니다:', dict(_r))
    data['townHouses'] = sorted(_rows, key=lambda r: (r[5], r[0]))
print(f'검사 통과: 밸런스 {len(seen)}항목, 의뢰 종류 {len(qtypes)}, 이름 {len(names)}, 요리 {len(meals)}, 스킬 {len(skills)}, '
      f'말풍선 {sum(len(x) for e in speech["L"].values() for x in e.values()) + len(speech["rumor"]) + sum(len(x) for x in speech["lina"].values())}줄, 대화 {sum(len(v) for v in dialog.values())}줄'
      + (f', 편집기 데이터: 소재 {len(content["materials"])}·아이템 {len(content["items"])}·몬스터 {len(content["monsters"])}·퀘스트 {len(content["quests"])}' if content else ', 편집기 데이터 없음(collegium_data.json)')
      + (f', 경고 {len(warns)}건' if warns else ''))
if '--check' in sys.argv: sys.exit(0)
body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
with open(OUT, 'w', encoding='utf-8', newline='\n') as fp:
    fp.write('/* 자동 생성 파일 — 직접 고치지 마세요.\n   data/*.csv · data/collegium_data.json 을 고친 뒤 `python prototype/tools/data_build.py` 로 다시 만듭니다. */\n')
    fp.write('(function (root) {\n  var D = ' + body + ';\n')
    fp.write("  if (typeof module !== 'undefined' && module.exports) module.exports = D;\n  if (root) root.GAME_DATA = D;\n")
    fp.write("})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));\n")
print('만듦:', os.path.relpath(OUT, ROOT))

# 아이콘을 게임 폴더로 복사: data/icons/*.png → prototype/assets/icons/ (배포는 prototype 폴더만 올라가므로)
if content is not None:
    import shutil
    src_dir, dst_dir = os.path.join(ROOT, 'data'), os.path.join(ROOT, 'assets')
    n_copy = n_miss = 0
    for o in content['materials'] + content['items']:
        rel = o.get('icon') or ''
        if not rel: continue
        src, dst = os.path.join(src_dir, rel), os.path.join(dst_dir, rel)
        if not os.path.exists(src): n_miss += 1; continue
        if os.path.exists(dst) and open(src, 'rb').read() == open(dst, 'rb').read(): continue
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(src, dst); n_copy += 1
    print(f'아이콘: 새로 복사 {n_copy}개' + (f', 파일 없음 {n_miss}개' if n_miss else '') + ' → prototype/assets/icons/')
