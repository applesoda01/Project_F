"""생성 시트의 '분할 제안' 가치를 재는 실험: 왼쪽 캐릭터 픽셀을 배치된 파츠 마스크 기준으로 나눴을 때 얼마나 안정적인가.
사용: python3 split_study.py 시트.png [...] --spec template_spec.json [--vis out.png]
지표: cover(원래 겹침), near6(미덮임 픽셀 중 파츠 6px 이내), split_agree(분할 영역과 생성 마스크의 일치, 면적 가중 IoU), multi(둘 이상 파츠가 겹친 픽셀 비율)"""
import sys, json, argparse, numpy as np, cv2
from score_sheet_x import score
COL = [(230,25,75),(60,180,75),(255,225,25),(0,130,200),(245,130,48),(145,30,180),(70,240,240),(240,50,230),(210,245,60),(250,190,212),(0,128,128),(220,190,255),(170,110,40),(255,250,200),(128,0,0),(170,255,195),(128,128,0),(255,215,180),(0,0,128),(128,128,128),(100,100,255),(255,100,100),(100,255,100),(200,200,0),(0,200,200)]
def study(path, spec, vis=None):
    r = score(path, spec, None, True); ex = r.pop('_extra')
    left, lm, PM, order = ex['left'], ex['left_mask'], ex['PM'], ex['order']
    keys = [k for k in order if k in PM]
    if not keys: return dict(r, error='no parts')
    cov = np.zeros(lm.shape, np.int32)
    for k in keys: cov += PM[k]
    covered = (cov > 0) & lm
    multi = float(((cov > 1) & lm).sum() / max(lm.sum(), 1))
    # 최근접 파츠(거리변환)
    dists = np.stack([cv2.distanceTransform((~PM[k]).astype(np.uint8), cv2.DIST_L2, 3) for k in keys])
    near = dists.argmin(0); dmin = dists.min(0)
    unc = lm & ~covered
    near6 = float(((dmin <= 6) & unc).sum() / max(unc.sum(), 1)) if unc.sum() else 1.0
    far = float(np.mean(dmin[unc])) if unc.sum() else 0.0
    # 분할: 덮인 픽셀은 그리기 순서상 마지막(위) 파츠, 미덮임은 최근접 파츠
    assign = -np.ones(lm.shape, np.int32)
    for i, k in enumerate(keys): assign[PM[k] & lm] = i
    assign[unc] = near[unc]
    ag = []; wts = []
    for i, k in enumerate(keys):
        reg = (assign == i) & lm
        a = PM[k] & lm
        u = (reg | a).sum()
        if u: ag.append((reg & a).sum() / u); wts.append(a.sum())
    agree = float(np.average(ag, weights=wts)) if wts and sum(wts) else 0.0
    out = dict(iou_now=r.get('iou'), cover_now=r.get('cover'), uncovered_px_ratio=round(float(unc.sum() / max(lm.sum(), 1)), 3), near6=round(near6, 3), mean_dist_uncovered=round(far, 1), multi_overlap=round(multi, 3), split_agree=round(agree, 3), n_parts=len(keys), presence=r['presence'])
    if vis:
        img = np.zeros(left.shape, np.uint8) + 235
        for i, k in enumerate(keys):
            img[(assign == i) & lm] = COL[i % len(COL)]
        lo = left.copy(); lo[~lm] = 235
        cv2.imwrite(vis, cv2.cvtColor(np.concatenate([lo, img], 1), cv2.COLOR_RGB2BGR))
    return out
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('sheets', nargs='+'); ap.add_argument('--spec', default='template_spec.json'); ap.add_argument('--vis')
    a = ap.parse_args()
    for p in a.sheets: print(p, json.dumps(study(p, a.spec, a.vis if len(a.sheets) == 1 else None), ensure_ascii=False))
