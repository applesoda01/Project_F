# 오브젝트 시트(흰 배경, 가로 나열) → 도트 오브젝트 PNG.
# 사용: python gem_objects.py <시트> <출력폴더> 이름:높이 이름:높이 ...  (왼쪽부터, 높이=도트 칸)
import sys, glob; from PIL import Image; import numpy as np, collections
from scipy import ndimage as nd
sheet,outdir,specs=sys.argv[1],sys.argv[2],sys.argv[3:]
src=Image.open(sheet).convert('RGB'); A=np.array(src).astype(int)
nw=np.abs(A-255).sum(2)>60
nw[1380:]=False  # 아래 워터마크 영역 제외
lab,n=nd.label(nd.binary_dilation(nw,iterations=int(__import__("os").environ.get("DIL","12"))))
objs=[s for i,s in enumerate(nd.find_objects(lab)) if (nw[s]&(lab[s]==i+1)).sum()>3000]
objs.sort(key=lambda s:s[1].start)
assert len(objs)==len(specs),(len(objs),[(s[1].start,s[1].stop) for s in objs])
ref=set()
for p in glob.glob('/mnt/user-data/outputs/pixel/*.png'):
    if 'sheet' in p: continue
    a=np.array(Image.open(p).convert('RGBA')); ref|=set(map(tuple,a[a[:,:,3]>0][:,:3].tolist()))
ref=np.array(sorted(ref))
for s,spec in zip(objs,specs):
    name,H=spec.split(':'); H=int(H)
    m=nw[s]; ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    crop=src.crop((s[1].start+x0-4,s[0].start+y0-4,s[1].start+x1+4,s[0].start+y1+4))
    W=max(1,round(H*crop.width/crop.height))
    q=crop.quantize(colors=16,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE)
    pal=np.array(q.getpalette()[:48]).reshape(-1,3); Q=np.array(q)
    white={i for i in range(16) if np.abs(pal[i]-255).sum()<120}
    snap=[]
    for c in pal:
        d=np.sqrt(((ref-c)**2).sum(1)); j=int(d.argmin()); snap.append(tuple(ref[j]) if d[j]<24 else tuple(c))
    out=np.zeros((H,W,4),np.uint8); sy=Q.shape[0]/H; sx=Q.shape[1]/W
    for j in range(H):
        for i in range(W):
            cell=Q[int(j*sy):max(int(j*sy)+1,int((j+1)*sy)),int(i*sx):max(int(i*sx)+1,int((i+1)*sx))]
            cnt=collections.Counter(cell.ravel().tolist()); c=cnt.most_common(1)[0][0]
            # 칸의 절반 이상이 흰색이면 투명, 아니면 흰색 아닌 것 중 최다
            wsum=sum(v for k,v in cnt.items() if k in white)
            if wsum>cell.size*0.5:
                out[j,i]=[247,245,240,1]   # 흰색 칸 표시(알파 1) → 아래에서 바깥과 이어진 것만 투명
                continue
            c=max((k for k in cnt if k not in white),key=lambda k:cnt[k])
            out[j,i]=list(snap[c])+[255]
    # 흰 몸통(닭 등)을 살리기: 가장자리와 이어진 흰 칸만 배경으로 보고 투명, 안쪽 흰 칸은 흰색으로 칠함
    wm=out[:,:,3]==1; lab2,_=nd.label(wm); edge=set(lab2[0].tolist()+lab2[-1].tolist()+lab2[:,0].tolist()+lab2[:,-1].tolist())-{0}
    bg=np.isin(lab2,list(edge)) | (wm if __import__('os').environ.get('FILLWHITE','1')=='0' else False); out[bg]=0; out[wm&~bg,3]=255
    Image.fromarray(out).save(f'{outdir}/{name}.png'); print(name,(W,H))
