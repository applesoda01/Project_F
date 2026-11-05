import numpy as np, cv2, sys, glob, json, os
from scipy import ndimage as ndi
T = cv2.imread('/tmp/mq3/tmpl_sil.png', 0); T = (T < 128)
def fig_mask(img):
    bg = np.median(np.concatenate([img[:20,:20].reshape(-1,3), img[:20,-20:].reshape(-1,3), img[-20:,:20].reshape(-1,3), img[-20:,-20:].reshape(-1,3)]),0)
    d = np.abs(img.astype(int)-bg).max(2) > 12
    d = cv2.morphologyEx(d.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5,5),np.uint8))
    f = ndi.binary_fill_holes(d)
    lab, n = ndi.label(f)
    if n == 0: return f, bg
    sizes = ndi.sum(f, lab, range(1,n+1)); f = lab == (1+int(np.argmax(sizes)))
    return f, bg
def measure(path):
    img = cv2.imread(path)
    if img.shape[:2] != (1024,1024): img = cv2.resize(img,(1024,1024))
    M, bg = fig_mask(img)
    iou = (M&T).sum()/max(1,(M|T).sum())
    er = cv2.erode(M.astype(np.uint8), np.ones((15,15),np.uint8)).astype(bool)   # 윤곽선 제외한 내부
    px = img[er].reshape(-1,3).astype(float)
    if len(px) < 100: return dict(iou=float(iou), ok=False)
    med = np.median(px,0); dev = np.abs(px-med).max(1)
    off = float((dev > 40).mean())            # 내부 중앙색에서 크게 벗어난 픽셀 비율(머리카락·옷·음영)
    sat = float(np.mean(cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[...,1][er]))
    # 머리카락·옷 의심: 내부에서 어두운(밝기 90 미만) 픽셀 비율
    dark = float((cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)[er] < 90).mean())
    ok_aux = (off < 0.03) and (dark < 0.02)
    return dict(iou=round(float(iou),4), off=round(off,4), dark=round(dark,4), area_ratio=round(float(M.sum()/T.sum()),3), aux_ok=bool(ok_aux), pass_=bool(iou>=0.9 and ok_aux))
if __name__=='__main__':
    for p in sys.argv[1:]: print(os.path.basename(p), measure(p))

def measure_c(path):
    """옷 입힌 그림용: 마네킹 실루엣 포함률(recall)과 초과 면적비. 머리카락·치마는 실루엣 밖으로 나가는 게 정상이라 IoU 대신 사용."""
    img = cv2.imread(path)
    if img.shape[:2] != (1024,1024): img = cv2.resize(img,(1024,1024))
    M, bg = fig_mask(img)
    rec = float((M&T).sum()/T.sum()); extra = float((M&~T).sum()/T.sum())
    ys, xs = np.where(M)
    ty, tx = np.where(T)
    # 키(머리 꼭대기~발바닥)와 중심 x 어긋남, 템플릿 대비
    dh = float((ys.max()-ys.min())/(ty.max()-ty.min())) if len(ys) else 0
    dx = float((xs.mean()-tx.mean())) if len(xs) else 0
    return dict(recall=round(rec,3), extra=round(extra,3), height_ratio=round(dh,3), dx=round(dx,1), iou=round(float((M&T).sum()/(M|T).sum()),3),
                pass_=bool(rec>=0.9 and extra<=0.5 and 0.9<=dh<=1.1))
