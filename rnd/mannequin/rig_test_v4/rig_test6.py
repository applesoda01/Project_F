"""v4: 마네킹 모양 유지 + v2 FK(박스의 회전·이동만 적용) + 크기 보정(엉덩이 축소, 손 확대)."""
import json, numpy as np, cv2, sys
sys.path.insert(0,'.')
import rig_test4 as R4
from rig_test4 import P2, pi, PR, M, complete, draw_part, idle, walk, evaluate as _ev, parts
from scipy import ndimage as ndi
KH=float(sys.argv[1]) if len(sys.argv)>1 else 0.55      # 엉덩이 선형 배율 (면적 326%→약 100%)
KHF=float(sys.argv[2]) if len(sys.argv)>2 else 1.89     # 앞손(fArmF) 배율 (면적 17%→60%)
KHB=float(sys.argv[3]) if len(sys.argv)>3 else 1.29     # 뒷손(fArmB) 배율 (면적 36%→60%)
def scale_mask(m,k,c=None):
    ys,xs=np.where(m); c=(xs.mean(),ys.mean()) if c is None else c
    A=cv2.getRotationMatrix2D((float(c[0]),float(c[1])),0,k)
    return cv2.warpAffine(m.astype(np.uint8)*255,A,(1024,1024),flags=cv2.INTER_LINEAR)>127
# 엉덩이
mh=scale_mask(complete('hip'),KH); pi['hip']=(draw_part(mh),mh)
# 손: 손 타원 기본 도형 영역만 따로 확대해 아래팔과 합침
for p,k in (('fArmF',KHF),('fArmB',KHB)):
    full=complete(p); hand=full&(cv2.dilate(PR[p],np.ones((1,1),np.uint8))>0)&(R4.PR[p]>0)
    # 손 영역 = 기본 도형 중 마지막 타원(손) 위치: 팔 끝쪽 가장 먼 원형 영역
    ys,xs=np.where(full); 
    # 손 중심 = 파츠 중 팔꿈치 피벗(PIV2)에서 가장 먼 점들의 평균
    ex,ey=R4.PIV2[p]; d=np.hypot(xs-ex,ys-ey); far=d>=np.percentile(d,80); hc=(xs[far].mean(),ys[far].mean())
    rad=0.5*np.sqrt(full.sum()*0.0+ (np.pi*0+1))  # 자리 표시
    H=full&(np.hypot(xs.max()*0+np.arange(1024)[None,:]-hc[0],np.arange(1024)[:,None]-hc[1])<(0.62*np.sqrt(full.sum()/np.pi)))
    fore=full&~H
    Hs=scale_mask(H,k,hc); m=ndi.binary_closing(fore|Hs,np.ones((5,5),bool)); pi[p]=(draw_part(m),m)
    print(p,'손 영역',int(H.sum()),'→',int(Hs.sum()),'합쳐진 면적',int(m.sum()))
R4.pi=pi
if __name__=='__main__':
    R4.evaluate(walk,'walk'); R4.evaluate(idle,'idle')
    import shutil
    for t in ('walk','idle'):
        for e in ('gif',): shutil.move(f'rig4_{t}.{e}',f'rig6_{t}.{e}')
        shutil.move(f'rig4_{t}_sheet.jpg',f'rig6_{t}_sheet.jpg')
    cv2.imwrite('rig6_rest.png',R4.run_fk([idle[0]],idle[0])[0][0])
