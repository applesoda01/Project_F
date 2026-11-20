import numpy as np, cv2
from PIL import Image
op=np.array(Image.open('open_sharp.png').convert('RGB')).astype(float)
sk=np.array(Image.open('b2_nolash.png').convert('RGB')).astype(float)  # 감은 눈 그림의 피부를 바탕으로
import sys; k=float(sys.argv[1]); out=sys.argv[2]
res=sk.copy()
# 눈 상자: (x0,x1, 위 속눈썹 위, 아래 눈꺼풀 아래)
for (x0,x1,t,b) in ((381,413,146,157),(421,463,144,155)):
  box=op[t:b,x0:x1]; h=b-t; nh=max(2,int(round(h*k)))
  sq=cv2.resize(box,(x1-x0,nh),interpolation=cv2.INTER_AREA)
  # 바탕(피부) 위에 아래쪽 맞춰 붙이고, 가장자리 부드럽게
  region=sk[t:b,x0:x1].copy(); region[h-nh:]=sq
  a=np.ones((h,x1-x0)); a[:,:2]=0.5; a[:,-2:]=0.5
  res[t:b,x0:x1]=res[t:b,x0:x1]*(1-a[...,None])+region*a[...,None]
Image.fromarray(res.clip(0,255).astype(np.uint8)).save(out)
