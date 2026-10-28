# 사용: python cloud_matte.py <검은배경.png> <흰배경.png> <출력폴더>  (이후 imagequant 품질 70~98로 양자화)
# 구름 시트 차이 매팅: 검은 배경(B)·흰 배경(W) 두 장 → 투명 PNG 4장
from PIL import Image; import numpy as np; from scipy import ndimage as nd; import sys,os
B=np.array(Image.open(sys.argv[1]).convert('RGB')).astype(float); W=np.array(Image.open(sys.argv[2]).convert('RGB')).astype(float); OUT=sys.argv[3]
a=1-(W-B).mean(2)/255; a=np.clip((a-0.03)/0.92,0,1)             # 바탕 잡티 제거, 속은 불투명
a=nd.median_filter(a,3)
F=np.where(a[...,None]>0.004,B/np.maximum(a[...,None],1e-3),0); F=np.clip(F,0,255)
H,Wd=a.shape
lab,n=nd.label(nd.binary_dilation(a>0.05,iterations=25))
objs=[]
for i,sl in enumerate(nd.find_objects(lab)):
    area=(lab[sl]==i+1).sum()
    if area<20000: continue                                     # 워터마크 등 작은 조각 제외
    objs.append((sl,i+1))
objs.sort(key=lambda o:(round(o[0][0].start/(H/2)),o[0][1].start))   # 위→아래, 왼→오
print('found',len(objs))
TARGET_W={0:1280,1:1100,2:840,3:1240}  # 2배 저장 기준 가로폭
K=1280/ (objs[0][0][1].stop-objs[0][0][1].start)                 # 1번 기준 단일 배율
os.makedirs(OUT,exist_ok=True)
for k,(sl,lid) in enumerate(objs):
    m=(lab==lid); aa=np.where(m,a,0)
    ys,xs=np.nonzero(aa>0.003); y0,y1,x0,x1=ys.min()-8,ys.max()+9,xs.min()-8,xs.max()+9
    y0=max(0,y0);x0=max(0,x0)
    rgba=np.dstack([F[y0:y1,x0:x1],aa[y0:y1,x0:x1]*255]).astype(np.uint8)
    im=Image.fromarray(rgba,'RGBA'); w,h=im.size; nw,nh=round(w*K),round(h*K)
    im=im.convert('RGBa').resize((nw,nh),Image.LANCZOS).convert('RGBA')
    im.save(f'{OUT}/cloud{k+1}.png',optimize=True); print(k+1,(w,h),'->',(nw,nh),os.path.getsize(f'{OUT}/cloud{k+1}.png'))
