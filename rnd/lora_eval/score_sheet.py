"""파츠 시트 채점: 오른쪽 패널의 파츠를 왼쪽 캐릭터 위에 다시 조립해 왼쪽과 얼마나 일치하는지 잰다.
사용: python3 score_sheet.py 시트.png [--spec template_spec.json] [--vis 출력.png]
시트는 1536x704(원본 2560x1152를 축소한 것)를 기준으로 한다. 크기가 다르면 같은 비율로 맞춘다."""
import sys, json, argparse
import numpy as np, cv2
from scipy import ndimage as ndi

ASM_W = 1024  # 원본 시트 좌표계에서 왼쪽 조립 영역 너비(패널은 그 오른쪽)

def mode_color(a):
    q = (a // 8).reshape(-1, 3).astype(np.int64)
    k = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
    v = np.bincount(k).argmax()
    return np.array([v // 1024, (v // 32) % 32, v % 32]) * 8 + 4

def fg_mask(rgb, bg, thr=28, min_area=12):
    d = np.abs(rgb.astype(int) - bg[None, None, :].astype(int)).max(2) > thr
    d = cv2.morphologyEx(d.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    lab, n = ndi.label(d)
    if n:
        sizes = ndi.sum(d, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= min_area])
        d = keep
    return ndi.binary_fill_holes(d)

def score(path, spec_path, vis=None, assemble=False):
    spec = json.load(open(spec_path))
    S = spec['slots']; order = spec['draw_order']; SW, SH = spec['sheet_size']
    im = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB)
    H, W = im.shape[:2]; sx, sy = W / SW, H / SH
    ax = int(ASM_W * sx)
    left = im[:, :ax]; panel_bg_all = mode_color(im[:, ax:])
    left_bg = mode_color(left)
    left_mask = fg_mask(left, left_bg, min_area=60)
    # 슬롯 사각형(현재 시트 좌표)
    R = {k: (int((ASM_W + v['x']) * sx), int(v['y'] * sy), int((ASM_W + v['x'] + v['w']) * sx), int((v['y'] + v['h']) * sy)) for k, v in S.items()}
    required = [k for k, v in S.items() if v['required']]
    # 1) 슬롯별 파츠 추출
    parts = {}; pad = 4
    for k, (x0, y0, x1, y1) in R.items():
        X0, Y0, X1, Y1 = max(x0 - pad, ax), max(y0 - pad, 0), min(x1 + pad, W), min(y1 + pad, H)
        reg = im[Y0:Y1, X0:X1]
        bg = mode_color(reg)
        m = fg_mask(reg, bg)
        if m.sum() >= 40:
            ys, xs = np.where(m)
            parts[k] = dict(rgb=reg[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(), mask=m[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(), area=int(m.sum()))
    presence = [k for k in required if k in parts]
    # 2) 패널 전경 중 슬롯 안에 든 비율
    pm = fg_mask(im[:, ax:], panel_bg_all)
    inside = np.zeros_like(pm)
    for (x0, y0, x1, y1) in R.values():
        inside[max(y0 - 6, 0):y1 + 6, max(x0 - ax - 6, 0):x1 - ax + 6] = True
    in_slot = float((pm & inside).sum() / max(pm.sum(), 1))
    # 3) 조립: 파츠마다 회전·배율·위치를 찾아(왼쪽 캐릭터와 가장 잘 맞는 자리) 그리기 순서대로 합성
    comp = np.zeros(left.shape, np.uint8); cmask = np.zeros(left.shape[:2], bool); placed = {}
    ds = 0.5
    lsm = cv2.resize(left, None, fx=ds, fy=ds, interpolation=cv2.INTER_AREA).astype(np.float32)
    lmk = cv2.resize(left_mask.astype(np.uint8), None, fx=ds, fy=ds, interpolation=cv2.INTER_NEAREST).astype(np.float32)
    def xform(rgb, m, ang, sc):
        h, w = m.shape; c = (w / 2, h / 2)
        M = cv2.getRotationMatrix2D(c, ang, sc)
        cs, sn = abs(M[0, 0]), abs(M[0, 1]); nw, nh = int(h * sn + w * cs) + 2, int(h * cs + w * sn) + 2
        M[0, 2] += nw / 2 - c[0]; M[1, 2] += nh / 2 - c[1]
        r = cv2.warpAffine(rgb, M, (nw, nh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))
        mm = cv2.warpAffine(m.astype(np.uint8), M, (nw, nh), flags=cv2.INTER_NEAREST) > 0
        return r, mm
    def best_place(p, angs, scs, rgb_full=None):
        best = None
        for sc in scs:
            for ang in angs:
                r, mm = xform(p['rgb'], p['mask'], ang, sc)
                rs = cv2.resize(r, None, fx=ds, fy=ds, interpolation=cv2.INTER_AREA).astype(np.float32)
                ms = cv2.resize(mm.astype(np.uint8), None, fx=ds, fy=ds, interpolation=cv2.INTER_NEAREST).astype(np.float32)
                th, tw = ms.shape
                if th < 3 or tw < 3 or th >= lsm.shape[0] or tw >= lsm.shape[1] or ms.sum() < 8: continue
                msk3 = np.repeat(ms[:, :, None], 3, 2)
                res = np.nan_to_num(cv2.matchTemplate(lsm, rs, cv2.TM_SQDIFF_NORMED, mask=msk3), nan=9.0, posinf=9.0)
                inside = cv2.matchTemplate(lmk, ms, cv2.TM_CCORR) / max(ms.sum(), 1)
                cost = res + 2.0 * (1.0 - np.clip(inside, 0, 1))
                v, _, loc = cv2.minMaxLoc(cost)[0], None, cv2.minMaxLoc(cost)[2]
                if best is None or v < best[0]: best = (v, ang, sc, loc)
        return best
    # 확인된 사실: 슬롯 파츠는 회전 없이 원본의 2.0배이고, 왼쪽 조립 그림은 캐릭터마다 4.0~4.56배다.
    # 따라서 파츠는 균일 배율(약 2.0~2.3배)과 평행이동만으로 맞는다. 배율은 큰 파츠 몇 개의 합산 비용으로 시트마다 한 번 정한다.
    def place_all(sc):
        cm = np.zeros(left.shape[:2], bool); cp = np.zeros(left.shape, np.uint8); pl = {}
        for k in order:
            if k not in parts: continue
            bb = best_place(parts[k], (0,), (sc,))
            if bb is None: continue
            v, ang, sc2, loc = bb
            r, mm = xform(parts[k]['rgb'], parts[k]['mask'], ang, sc2)
            x, y = int(loc[0] / ds), int(loc[1] / ds); h2, w2 = mm.shape
            y1, x1 = min(y + h2, cm.shape[0]), min(x + w2, cm.shape[1])
            m2 = mm[:y1 - y, :x1 - x]; r2 = r[:y1 - y, :x1 - x]
            cp[y:y1, x:x1][m2] = r2[m2]; cm[y:y1, x:x1] |= m2; pl[k] = (x, y, round(float(sc2), 2), round(float(v), 3))
        return cm, cp, pl
    gs = None
    if assemble:
        best = None
        for sc in np.arange(1.3, 2.61, 0.1):
            cm, cp, pl = place_all(float(sc))
            i = (cm & left_mask).sum() / max((cm | left_mask).sum(), 1)
            if best is None or i > best[0]: best = (i, float(sc))
        for sc in np.arange(best[1] - 0.08, best[1] + 0.09, 0.04):
            cm, cp, pl = place_all(float(sc))
            i = (cm & left_mask).sum() / max((cm | left_mask).sum(), 1)
            if i > best[0]: best = (i, float(sc))
        gs = round(best[1], 2)
        cmask, comp, placed = place_all(gs)
    # 4) 색 일치(조립과 무관): 파츠 픽셀 색이 왼쪽 캐릭터에 실제로 있는 색인지
    lp = left[left_mask].reshape(-1, 3).astype(int); q = (lp // 16)
    keys, cnt = np.unique(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2], return_counts=True)
    pal = np.array([[(k // 256) * 16 + 8, ((k // 16) % 16) * 16 + 8, (k % 16) * 16 + 8] for k, c in zip(keys, cnt) if c >= 0.003 * len(lp)])
    hit = tot = 0
    for p in parts.values():
        px = p['rgb'][p['mask']].astype(int)
        if len(px) == 0 or len(pal) == 0: continue
        d = np.abs(px[:, None, :] - pal[None, :, :]).max(2).min(1)
        hit += int((d <= 36).sum()); tot += len(px)
    palette_ok = hit / max(tot, 1)
    area_ratio = sum(p['area'] for p in parts.values()) / max(left_mask.sum(), 1)
    inter = (cmask & left_mask).sum(); union = (cmask | left_mask).sum()
    iou = float(inter / max(union, 1)); cover = float(inter / max(left_mask.sum(), 1))
    ov = cmask & left_mask
    diff = np.abs(comp.astype(int) - left.astype(int)).max(2)
    color_ok = float(((diff <= 45) & ov).sum() / max(ov.sum(), 1))
    out = dict(scale=gs, palette_match=round(float(palette_ok), 3), area_ratio=round(float(area_ratio), 3), presence=f'{len(presence)}/{len(required)}', missing=[k for k in required if k not in parts],
               in_slot=round(in_slot, 3), parts_found=len(parts))
    if assemble:  # 실험 기능: 정답 학습 시트에서도 일치율이 낮아 아직 신뢰할 수 없음
        out.update(iou=round(iou, 3), cover=round(cover, 3), color_match=round(color_ok, 3))
    if vis:
        v = np.concatenate([left, comp, np.stack([np.where(left_mask, 255, 0).astype(np.uint8), np.where(cmask, 255, 0).astype(np.uint8), np.zeros(left.shape[:2], np.uint8)], 2)], 1)
        cv2.imwrite(vis, cv2.cvtColor(v, cv2.COLOR_RGB2BGR))
    return out

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('sheet'); ap.add_argument('--spec', default='template_spec.json'); ap.add_argument('--vis'); ap.add_argument('--assemble', action='store_true')
    a = ap.parse_args(); r = score(a.sheet, a.spec, a.vis, a.assemble); print(json.dumps(r, ensure_ascii=False))
