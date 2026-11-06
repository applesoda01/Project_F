import sys; sys.path.insert(0,'/tmp/mq10')
import numpy as np, cv2, rig8 as R
from scipy import ndimage as ndi
N=1024; PAD=70; f4=R.walk[4]
src=cv2.imread('lina4008.png')
bg=np.median(np.concatenate([src[:20,:20].reshape(-1,3),src[:20,-20:].reshape(-1,3),src[-20:,:20].reshape(-1,3),src[-20:,-20:].reshape(-1,3)]),0)
d=np.abs(src.astype(int)-bg).max(2)>14; d=cv2.morphologyEx(d.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8)); fm=ndi.binary_fill_holes(d)
lab,n=ndi.label(fm); s=ndi.sum(fm,lab,range(1,n+1)); M=lab==(1+int(np.argmax(s)))
cv2.imwrite('fig_mask.png',M.astype(np.uint8)*255)
# 마네킹 파츠 마스크(캔버스)
mm={}; A={}
for p in R.P2:
    A[p]=R.affine(p,f4); w=cv2.warpAffine(R.IMG[p],A[p],(N,N),flags=cv2.INTER_LINEAR,borderValue=(0,0,0,0)); mm[p]=w[:,:,3]>128
# 앞쪽 파츠 우선 배정
lbl=np.full((N,N),-1,int)
for i,p in enumerate(R.P2): lbl[mm[p]]=i
# 마네킹 밖 의상 픽셀은 가장 가까운 파츠로
dist=np.stack([ndi.distance_transform_edt(~mm[p]) for p in R.P2],0); near=np.argmin(dist,0)
free=(lbl<0)&M; lbl[free]=near[free]
hb=np.zeros((N,N),np.uint8); cv2.fillPoly(hb,[R.cvp(f4[R.SRC['hip']]).astype(np.int32)],1)
hi=R.P2.index('hip'); sel=(hb>0)&M&np.isin(lbl,[R.P2.index(x) for x in ('body','thighB','thighF')])
lbl[sel]=hi
rgba=np.dstack([src,(M*255).astype(np.uint8)])
OUT={}
for i,p in enumerate(R.P2):
    own=(lbl==i)&M; lay=cv2.dilate(own.astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))>0   # 겹침 약 6px
    lay&=M
    cv=rgba.copy(); cv[~lay]=0
    h,w=R.IMG[p].shape[:2]; M2=A[p]@np.array([[1,0,-PAD],[0,1,-PAD],[0,0,1]])
    out=cv2.warpAffine(cv,M2,(w+2*PAD,h+2*PAD),flags=cv2.WARP_INVERSE_MAP|cv2.INTER_LINEAR,borderValue=(0,0,0,0))
    OUT[p]=out; cv2.imwrite(f'part_{p}.png',out)
print({p:int((OUT[p][:,:,3]>128).sum()) for p in OUT})
