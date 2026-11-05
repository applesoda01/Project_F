import numpy as np, cv2, glob, json, os, sys
from measure import fig_mask
ref = cv2.imread('/mnt/user-data/uploads/Project_F/art_source/receptionist_128/receptionist_idle_blink.png', cv2.IMREAD_UNCHANGED)
cell = ref[:, :ref.shape[1]//3]
a = cell[...,3] > 200 if cell.shape[2]==4 else np.ones(cell.shape[:2],bool)
def palette(px, k=7):
    px = np.float32(cv2.cvtColor(px.reshape(-1,1,3).astype(np.uint8), cv2.COLOR_BGR2LAB).reshape(-1,3))
    if len(px) > 20000: px = px[np.random.RandomState(0).choice(len(px), 20000, replace=False)]
    crit = (cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER, 30, 1.0)
    _, lab, c = cv2.kmeans(px, k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    w = np.bincount(lab.ravel(), minlength=k)/len(lab); return c, w
# 윤곽선(검정) 제외한 색만
RP = cell[...,:3][a]; keep = RP.max(1) > 60; RP = RP[keep]
rc, rw = palette(RP)
def lina_score(path):
    img = cv2.imread(path); M,_ = fig_mask(img)
    er = cv2.erode(M.astype(np.uint8), np.ones((5,5),np.uint8)).astype(bool)
    px = img[er]; px = px[px.max(1) > 60]
    gc, gw = palette(px)
    # 참조 색 각각이 생성물에 얼마나 가까운 색으로 존재하는가(가중 평균 LAB 거리, 낮을수록 좋음)
    d = np.linalg.norm(rc[:,None,:]-gc[None,:,:],axis=2).min(1)
    return float((rw*d).sum())
if __name__=='__main__':
    for p in sys.argv[1:]: print(os.path.basename(os.path.dirname(p)), os.path.basename(p), round(lina_score(p),1))
