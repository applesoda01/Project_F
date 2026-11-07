import numpy as np, cv2
src=cv2.imread('/mnt/user-data/uploads/output/lina_v9b_9502_00001_.png')
m=(src.astype(int).sum(2)<720);ys,xs=np.where(m);c=src[ys.min():ys.max()+1,xs.min():xs.max()+1]
H=745;W=round(c.shape[1]*H/c.shape[0]);c=cv2.resize(c,(W,H),interpolation=cv2.INTER_AREA)
CUT=335;EXT=395;s=0.603
from scipy import ndimage as ndi
nb=(c[CUT:].astype(int).sum(2)<720)
nb=cv2.morphologyEx(nb.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))>0
lab,n=ndi.label(nb);sz=ndi.sum(nb,lab,range(1,n+1));main=1+int(np.argmax(sz))
stray=(lab>0)&(lab!=main)
stray=cv2.dilate(stray.astype(np.uint8),np.ones((3,3),np.uint8))>0
EXT=CUT+int(np.where(stray.any(1))[0].max())+3 if stray.any() else CUT
print('stray px',int(stray.sum()),'EXT',EXT)
head=np.full((EXT,c.shape[1],3),255,np.uint8);head[:CUT]=c[:CUT]
hs=stray[:EXT-CUT];head[CUT:EXT][hs]=c[CUT:EXT][hs]
body=c[CUT:].copy();body[stray]=255
hm_rows=(c[:CUT].astype(int).sum(2)<720)[-14:]
xs2=np.where(hm_rows.any(0))[0];hx=(xs2.min()+xs2.max())/2
bmask=(body[:6].astype(int).sum(2)<720);xs3=np.where(bmask.any(0))[0];bx=(xs3.min()+xs3.max())/2
hh=cv2.resize(head,(round(head.shape[1]*s),round(head.shape[0]*s)),interpolation=cv2.INTER_AREA)
chin=round(CUT*s);tot=chin+body.shape[0];Wc=max(hh.shape[1],body.shape[1])+300
cv=np.full((tot+hh.shape[0],Wc,3),255,np.uint8)
bx0=150;cv[chin:chin+body.shape[0],bx0:bx0+body.shape[1]]=body
hx0=int(round(bx0+bx-hx*s))
reg=cv[:hh.shape[0],hx0:hx0+hh.shape[1]];mk=(hh.astype(int).sum(2)<720)[...,None]
cv[:hh.shape[0],hx0:hx0+hh.shape[1]]=np.where(mk,hh,reg)
mm=(cv.astype(int).sum(2)<720);ys,xs=np.where(mm);cv=cv[ys.min():ys.max()+1,xs.min():xs.max()+1]
sc=745/cv.shape[0];cv=cv2.resize(cv,(round(cv.shape[1]*sc),745),interpolation=cv2.INTER_AREA)
out=np.full((1024,1024,3),255,np.uint8);y0=170;x0=540-cv.shape[1]//2
out[y0:y0+745,x0:x0+cv.shape[1]]=cv
cv2.imwrite('lina_fit.png',out);print(cv.shape,sc)
