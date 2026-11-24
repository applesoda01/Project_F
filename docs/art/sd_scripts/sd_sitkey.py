# 앉은 그림 → 1024² 마젠타, 서 있는 시작 이미지와 같은 배율(머리 크기 기준)로 · 발 894 · 가운데 512 [+flip]
import sys,numpy as np
from PIL import Image
from scipy import ndimage
src,stand,out=sys.argv[1:4]; flip=len(sys.argv)>4 and sys.argv[4]=='flip'
def cut(p):
    f=np.array(Image.open(p).convert('RGB')).astype(np.float32)
    bg=np.median(np.concatenate([f[:8].reshape(-1,3),f[:,:8].reshape(-1,3)]),0)
    d=np.abs(f-bg).sum(2); al=np.clip((d-60)/(200-60),0,1)
    m=al>0.35; lab,n=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,n+1)); keep=ndimage.binary_dilation(lab==(1+int(np.argmax(sz))),iterations=2); al=np.where(keep,al,0)
    solid=al>=0.98; idx=ndimage.distance_transform_edt(~solid,return_distances=False,return_indices=True); col=np.where(solid[...,None],f,f[idx[0],idx[1]])
    R,G,B=col[...,0],col[...,1],col[...,2]; mm=np.minimum(R,B)-G; sp=(mm>35)&(R>110); col=np.dstack([np.where(sp,R-mm*0.8,R),G,np.where(sp,B-mm*0.8,B)])
    ys,xs=np.nonzero(al>0.5); return Image.fromarray(np.dstack([np.clip(col,0,255),al*255]).astype(np.uint8)[ys.min():ys.max()+1,xs.min():xs.max()+1],'RGBA')
im=cut(src)
if flip: im=im.transpose(Image.FLIP_LEFT_RIGHT)
# 머리 폭(위 30%의 최대 폭)을 서 있는 그림과 맞춤
def headw(a):
    A=np.array(a)[...,3]>128; h=A.shape[0]; return max((r.sum() for r in A[:int(h*0.3)]))
st=Image.open(stand).convert('RGBA'); st=st.crop(st.getbbox())
s=headw(st)/headw(im); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
c=Image.new('RGB',(1024,1024),(255,0,255)); c.paste(im,(512-im.width//2,894-im.height),im); c.save(out)
print(out,im.size,'scale',round(s,3))
