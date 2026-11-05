"""idle/run 단색 마네킹 (v0). 숫자 데이터(txt)에서 읽어 GIF·시트·지표 생성. walk_v0.py 의 렌더러 재사용."""
import os, json
from PIL import Image
import walk_v0 as w
HERE = os.path.dirname(os.path.abspath(__file__))

def load(fn):
    out = []
    for line in open(os.path.join(HERE, fn)).read().strip().splitlines():
        out.append({p: [float(x) for x in seg.split(',')] for p, seg in zip(w.PARTS, line.split('|'))})
    return out

M = {'walk': (w.FRAMES, 24), 'idle': (load('idle_v0.txt'), 24), 'run': (load('run_v0.txt'), 18)}
for name, (fr, n) in M.items():
    assert len(fr) == n, (name, len(fr))
    ims = [w.render(f) for f in fr]
    dur = int(round(1000 / 30))
    if name != 'walk':
        ims[0].save(os.path.join(HERE, f'{name}_v0.gif'), save_all=True, append_images=ims[1:], duration=dur, loop=0)
        json.dump({'fps': 30, 'frames': n, 'parts_draw_order': w.PARTS, 'data': fr}, open(os.path.join(HERE, f'{name}_v0.json'), 'w'), separators=(',', ':'))
    cols = 6; rows = (n + cols - 1)//cols
    sh = Image.new('RGB', (w.W*cols//2, w.H*rows//2))
    for i, im in enumerate(ims): sh.paste(im.resize((w.W//2, w.H//2)), ((i % cols)*w.W//2, (i//cols)*w.H//2))
    sh.save(os.path.join(HERE, f'{name}_v0_sheet.png'))
    by = [f['body'][1] for f in fr]
    def cx(p): return [sum(f[p][0::2])/4 for f in fr]
    lf, lb = cx('legF'), cx('legB')
    print(f"{name}: {n}프레임 ({n/30:.2f}초) 몸통 상하 {max(by)-min(by):.0f}단위, 앞다리 스윙 {max(lf)-min(lf):.0f}, 뒷다리 스윙 {max(lb)-min(lb):.0f}, "
          f"다리 위상차 {abs(lf.index(max(lf))-lb.index(max(lb)))}프레임, 머리 상하 {max(f['head'][1] for f in fr)-min(f['head'][1] for f in fr):.0f}")
