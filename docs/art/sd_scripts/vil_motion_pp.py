# 마을 주민 모션 후처리: LTX 영상(마젠타) → 키잉 → 정렬 프레임 → 게임 시트(÷4)
# python3 vpp.py walk|sit|eat|beer 영상.mp4 출력폴더 [eat/beer: 앉기출력폴더]
# python3 vpp.py idle 시작rgba.png 출력폴더
import sys,os,json,math,cv2,numpy as np
from PIL import Image
from scipy import ndimage
mode,src,out=sys.argv[1:4]; os.makedirs(out,exist_ok=True)
SPEC={'walk':dict(W=640,H=800,n=24,cols=12,foot=787,cx=320,h=516),
      'idle':dict(W=640,H=800,n=36,cols=12,foot=787,cx=320,h=516),
      'sit': dict(W=720,H=700,n=35,cols=12,foot=588,cx=360,h=512),
      'eat': dict(W=720,H=700,n=24,cols=12),'beer':dict(W=720,H=700,n=24,cols=12)}[mode]
W,H,N,COLS=SPEC['W'],SPEC['H'],SPEC['n'],SPEC['cols']
def key(rgb,bg):
    f=rgb.astype(np.float32); d=np.abs(f-bg).sum(2)
    al=np.clip((d-60)/(200-60),0,1); solid=al>=0.98
    idx=ndimage.distance_transform_edt(~solid,return_distances=False,return_indices=True)
    col=np.where(solid[...,None],f,f[idx[0],idx[1]])
    m=al>0.35; lab,nn=ndimage.label(m,structure=np.ones((3,3)))
    if nn:
        sz=ndimage.sum(m,lab,range(1,nn+1)); keep=np.isin(lab,[i+1 for i,s in enumerate(sz) if s>=300]); keep=ndimage.binary_dilation(keep,iterations=2); al=np.where(keep,al,0)
    R,G,B=col[...,0],col[...,1],col[...,2]; mm=np.minimum(R,B)-G; sp=(mm>35)&(R>110)
    col=np.dstack([np.where(sp,R-mm*0.8,R),G,np.where(sp,B-mm*0.8,B)])
    # 가장자리 4px 안의 녹색 번짐만 누름 (초록 원피스 같은 안쪽 색은 그대로)
    inner=ndimage.binary_erosion(al>0.5,iterations=4); edge=(al>0)&~inner
    mx=np.maximum(col[...,0],col[...,2]); g=np.where(edge,np.minimum(col[...,1],mx*1.02+4),col[...,1]); col[...,1]=g
    return np.clip(col,0,255),al
def bbox(al):
    ys,xs=np.nonzero(al>0.5); return xs.min(),xs.max(),ys.min(),ys.max()
def place(col,al,M):
    pm=np.dstack([col*al[...,None],al*255]).astype(np.float32)
    w=cv2.warpAffine(pm,M,(W,H),flags=cv2.INTER_AREA,borderValue=0)
    a=w[...,3:]/255; c=np.where(a>0.004,w[...,:3]/np.maximum(a,1e-4),0)
    return np.dstack([np.clip(c,0,255),w[...,3]]).astype(np.uint8)
frames=[]
if mode=='idle':
    im=np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    col,al=im[...,:3],im[...,3]/255; x0,x1,y0,y1=bbox(al); s=SPEC['h']/(y1-y0+1)
    for i in range(N):
        b=1+(10/516)*0.5*(1-math.cos(2*math.pi*i/N))  # 숨쉬기: 발 기준 세로 최대 +10px
        M=np.float32([[s,0,SPEC['cx']-s*(x0+x1)/2],[0,s*b,SPEC['foot']-s*b*y1]])
        frames.append(place(col,al,M))
else:
    c=cv2.VideoCapture(src); fr=[]
    while True:
        ok,x=c.read()
        if not ok: break
        fr.append(cv2.cvtColor(x,cv2.COLOR_BGR2RGB))
    bg=np.median(np.concatenate([fr[0][:6].reshape(-1,3),fr[0][:,:6].reshape(-1,3)]).astype(np.float32),0)
    T=len(fr); last=T-1
    sel=[round(i*(last-1)/N) for i in range(N)] if mode in('walk','eat','beer') else [round(i*last/(N-1)) for i in range(N)]
    col0,al0=key(fr[0],bg); x0,x1,y0,y1=bbox(al0)
    if mode in('walk','sit'):
        s=SPEC['h']/(y1-y0+1); M=np.float32([[s,0,SPEC['cx']-s*(x0+x1)/2],[0,s,SPEC['foot']-s*y1]])
    else:  # 먹기 · 맥주: 첫 장을 앉기 마지막 장에 맞춤
        sitdir=sys.argv[4]; ref=np.array(Image.open(os.path.join(sitdir,'f_%02d.png'%34)))[...,3]/255
        rx0,rx1,ry0,ry1=bbox(ref); s=(ry1-ry0+1)/(y1-y0+1)
        M=np.float32([[s,0,(rx0+rx1)/2-s*(x0+x1)/2],[0,s,ry1-s*y1]])
    # 색 보정: 첫 장의 캐릭터 색을 시작 이미지(REF) 색에 맞춤 (LTX가 녹색 · 어둡게 끌어가는 것)
    gain=np.ones(3,np.float32)
    ref=os.environ.get('REF')
    if ref:
        r=np.array(Image.open(ref).convert('RGBA')).astype(np.float32); ra=r[...,3]>200
        fa=al0>0.98; gain=np.clip(r[...,:3][ra].mean(0)/np.maximum(col0[fa].mean(0),1),0.8,1.25); print('gain',gain.round(3))
    for i in sel:
        col,al=key(fr[i],bg); frames.append(place(np.clip(col*gain,0,255),al,M))
    json.dump({'src':os.path.basename(src),'T':T,'sel':sel,'M':M.tolist()},open(os.path.join(out,'meta.json'),'w'))
for i,f in enumerate(frames): Image.fromarray(f,'RGBA').save(os.path.join(out,'f_%02d.png'%i))
cw,ch=W//4,H//4; rows=math.ceil(N/COLS); sh=Image.new('RGBA',(cw*COLS,ch*rows),(0,0,0,0))
for i,f in enumerate(frames):
    p=Image.fromarray(f,'RGBA')
    # 알파 곱한 상태로 축소
    a=np.array(p).astype(np.float32); pm=np.dstack([a[...,:3]*a[...,3:]/255,a[...,3]]); sm=np.array(Image.fromarray(pm.astype(np.uint8),'RGBA').resize((cw,ch),Image.LANCZOS)).astype(np.float32)
    A=sm[...,3:]/255; c=np.where(A>0.004,sm[...,:3]/np.maximum(A,1e-4),0); sh.paste(Image.fromarray(np.dstack([np.clip(c,0,255),sm[...,3]]).astype(np.uint8),'RGBA'),((i%COLS)*cw,(i//COLS)*ch))
sh.save(os.path.join(out,'sheet.webp'),quality=88); sh.save(os.path.join(out,'sheet.png'))
g=[Image.alpha_composite(Image.new('RGBA',(W,H),(200,200,200,255)),Image.fromarray(f,'RGBA')).convert('RGB').resize((W//2,H//2)) for f in frames]
g[0].save(os.path.join(out,'prev.gif'),save_all=True,append_images=g[1:],duration=1000//(24 if mode=='walk' else 12),loop=0)
print(mode,'frames',len(frames),'sheet',sh.size)
