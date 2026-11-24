# 부위 시트 왼쪽 캐릭터 → 배경 제거(테두리에서 이어진 밝은 배경만, 외곽선에서 멈춤) → 마젠타 640×800 · 키 516 · 발 787 · x 320
import sys,numpy as np
from PIL import Image
from scipy import ndimage
src,out=sys.argv[1],sys.argv[2]; TH=float(sys.argv[3]) if len(sys.argv)>3 else 38
im=np.array(Image.open(src).convert('RGB')).astype(np.float32)
L=im[:, :600]  # 왼쪽 조립 캐릭터 영역
# 왼쪽 영역에서 가장 큰 덩어리를 캐릭터로
bg=np.median(np.concatenate([L[:6].reshape(-1,3),L[:,:6].reshape(-1,3),L[-6:].reshape(-1,3)]),0)
d=np.abs(L-bg).sum(2)
near=d<TH
lab,n=ndimage.label(near)
edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
bgm=np.isin(lab,list(edge))
fg=~bgm
fg=ndimage.binary_opening(fg,iterations=1)
lab2,n2=ndimage.label(fg); sz=ndimage.sum(fg,lab2,range(1,n2+1))
main=lab2==(1+int(np.argmax(sz)))
main=ndimage.binary_fill_holes(main)
# 오른쪽으로 붙은 부위 조각이 있으면 x 범위를 확인
ys,xs=np.nonzero(main); print('bbox',xs.min(),xs.max(),ys.min(),ys.max(),'bg',bg)
al=ndimage.gaussian_filter(main.astype(np.float32),0.7)
crop=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
rgb=L[crop[1]:crop[3],crop[0]:crop[2]]; a=al[crop[1]:crop[3],crop[0]:crop[2]]
h=rgb.shape[0]; s=516/h
W,H=int(rgb.shape[1]*s),516
pm=np.dstack([rgb*a[...,None],a*255]).astype(np.uint8)
ri=Image.fromarray(pm,'RGBA').resize((W,H),Image.LANCZOS)
r=np.array(ri).astype(np.float32); A=r[...,3:]/255; col=np.where(A>0,r[...,:3]/np.maximum(A,1e-3),0)
canvas=np.zeros((800,640,4),np.float32)
x0=320-W//2; y0=787-H
canvas[y0:y0+H,x0:x0+W,:3]=col; canvas[y0:y0+H,x0:x0+W,3]=A[...,0]*255
rgba=Image.fromarray(np.clip(canvas,0,255).astype(np.uint8),'RGBA'); rgba.save(out.replace('.png','_rgba.png'))
mag=Image.new('RGB',(640,800),(255,0,255)); mag.paste(rgba,(0,0),rgba); mag.save(out)
print('scale',round(s,3),'size',W,H)
