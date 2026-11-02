# 블록 시트(흰 배경, 블록 가로 나열) → 32칸 도트 블록들.
# 사용: python gem_sheet.py <시트.png> <출력폴더> 이름1 이름2 ...  (이름 순서 = 왼쪽부터)
# - 블록마다 바깥 테두리·모서리 음영(33px) 제거, 위로 풀잎이 솟은 블록은 32×44(위 12줄 장식), 아니면 32×32
# - 색: 시트 전체를 14색으로 묶은 뒤, 기존 블록 팔레트와 가까운 색(거리<28)은 기존 색으로 맞춤
import sys, glob; from PIL import Image; import numpy as np, collections
from scipy import ndimage as nd
sheet,outdir,names=sys.argv[1],sys.argv[2],sys.argv[3:]
src=Image.open(sheet).convert('RGB'); A=np.array(src).astype(int)
nw=np.abs(A-255).sum(2)>40; lab,n=nd.label(nd.binary_closing(nw,iterations=int(__import__("os").environ.get("CLOSE","4"))))
objs=[s for i,s in enumerate(nd.find_objects(lab)) if (lab[s]==i+1).sum()>50000]
objs.sort(key=lambda s:s[1].start)
_bx=__import__('os').environ.get('XS')   # 붙어 있는 블록은 가로 구간을 직접 지정: "91-952,952-1813,1949-2661"
if _bx:
    ys=objs[0][0]; objs=[(ys,slice(int(a),int(b))) for a,b in (p.split('-') for p in _bx.split(','))]
assert len(objs)==len(names),(len(objs),names)
ref=set()
for p in glob.glob('/mnt/user-data/outputs/pixel/*.png'):
    if 'sheet' in p: continue
    a=np.array(Image.open(p).convert('RGBA')); ref|=set(map(tuple,a[a[:,:,3]>0][:,:3].tolist()))
ref=np.array(sorted(ref))
q=src.quantize(colors=15,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE)
pal=np.array(q.getpalette()[:45]).reshape(-1,3); Q=np.array(q)
white={i for i in range(15) if np.abs(pal[i]-255).sum()<150}
snap={}
for i in range(15):
    d=np.sqrt(((ref-pal[i])**2).sum(1)); j=int(d.argmin())
    snap[i]=tuple(ref[j]) if d[j]<28 else tuple(pal[i])
I=33
def cell_mode(sub,H,W):
    out=np.zeros((H,W,4),np.uint8); sy=sub.shape[0]/H; sx=sub.shape[1]/W
    for j in range(H):
        for i in range(W):
            c=collections.Counter(sub[int(j*sy):max(int(j*sy)+1,int((j+1)*sy)),int(i*sx):int((i+1)*sx)].ravel().tolist()).most_common(1)[0][0]
            out[j,i]=[0,0,0,0] if c in white else list(snap[c])+[255]
    return out
for s,spec in zip(objs,names):
    name,kind=spec.split(':')
    y0,y1,x0,x1=s[0].start,s[0].stop,s[1].start,s[1].stop
    if kind=='b':   # 아랫줄 블록: 32×32
        out=cell_mode(Q[y0+I:y1-I,x0+I:x1-I],32,32)
    else:           # 윗줄 블록: 32×44, 지면(첫 꽉 찬 줄)을 y=8에, 바닥을 y=44에 맞춤
        fill=(~np.isin(Q[y0:y1,x0+I:x1-I],list(white))).mean(1)
        sr=y0+int(np.argmax(fill>0.9)); py=(y1-I-sr)/36
        out=cell_mode(Q[max(0,int(sr-8*py)):y1-I,x0+I:x1-I],44,32)
    Image.fromarray(out).save(f'{outdir}/{name}.png'); print(name,out.shape[:2])
