# 마젠타 배경 그림 → 캐릭터만 (L1 거리 키) → 1024² 마젠타, 키 529, 발 894, 가운데 512  [+ flip]
import sys,numpy as np
from PIL import Image
from scipy import ndimage
src,out=sys.argv[1],sys.argv[2]; flip=len(sys.argv)>3 and sys.argv[3]=='flip'
f=np.array(Image.open(src).convert('RGB')).astype(np.float32)
bg=np.median(np.concatenate([f[:8].reshape(-1,3),f[:,:8].reshape(-1,3)]),0)
d=np.abs(f-bg).sum(2); al=np.clip((d-60)/(200-60),0,1)
m=al>0.35; lab,n=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,n+1)); keep=lab==(1+int(np.argmax(sz)))
keep=ndimage.binary_dilation(keep,iterations=2); al=np.where(keep,al,0)
solid=al>=0.98; idx=ndimage.distance_transform_edt(~solid,return_distances=False,return_indices=True)
col=np.where(solid[...,None],f,f[idx[0],idx[1]])
R,G,B=col[...,0],col[...,1],col[...,2]; mm=np.minimum(R,B)-G; sp=(mm>35)&(R>110)
col=np.dstack([np.where(sp,R-mm*0.8,R),G,np.where(sp,B-mm*0.8,B)])
ys,xs=np.nonzero(al>0.5); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
rgba=np.dstack([np.clip(col,0,255),al*255]).astype(np.uint8)[y0:y1,x0:x1]
im=Image.fromarray(rgba,'RGBA')
if flip: im=im.transpose(Image.FLIP_LEFT_RIGHT)
s=529/im.height; im=im.resize((round(im.width*s),529),Image.LANCZOS)
c=Image.new('RGB',(1024,1024),(255,0,255)); c.paste(im,(512-im.width//2,894-529),im); c.save(out)
t=Image.new('RGBA',(1024,1024),(0,0,0,0)); t.paste(im,(512-im.width//2,894-529),im); t.save(out.replace('.png','_rgba.png'))
print(out,im.size)
