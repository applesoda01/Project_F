# 추가 블록 시트 → 32칸 도트 블록. 기존 블록 4종의 13색(+흰 배경)에 맞춰 같은 색만 쓰게 한다.
import sys, glob; from PIL import Image; import numpy as np, collections
sheet, outdir = sys.argv[1], sys.argv[2]
cols=set()
for p in ['gem_grass_a.png','gem_grass_b.png','gem_dirt_a.png','gem_dirt_b.png']:
    a=np.array(Image.open(p)); cols|=set(map(tuple,a[a[:,:,3]>0][:,:3]))
cols=sorted(cols)+[(255,255,255)]; WHITE=len(cols)-1
palimg=Image.new('P',(1,1)); flat=[c for t in cols for c in t]; palimg.putpalette(flat+[0]*(768-len(flat)))
src=Image.open(sheet).convert('RGB')
def grab(x0,y0,x1,y1,W,H):
    Q=np.array(src.crop((x0,y0,x1,y1)).quantize(palette=palimg,dither=Image.Dither.NONE))
    out=np.zeros((H,W,4),np.uint8); sx=Q.shape[1]/W; sy=Q.shape[0]/H
    for j in range(H):
        for i in range(W):
            c=collections.Counter(Q[int(j*sy):int((j+1)*sy),int(i*sx):int((i+1)*sx)].ravel().tolist()).most_common(1)[0][0]
            out[j,i]=[0,0,0,0] if c==WHITE else list(cols[c])+[255]
    return Image.fromarray(out,'RGBA')
I=33
spec=[('dirt_c',91,643,475,1062,'d'),('dirt_d',779,1308,475,1062,'d'),('dirt_e',1444,1973,475,1062,'d'),('grass_c',2109,2661,361,1062,'g')]
for name,x0,x1,yt,yb,t in spec:
    if t=='d': im=grab(x0+I,yt+I,x1-I,yb-I,32,32)
    else:
        w=(x1-x0)-2*I; im=grab(x0+I,yb-I-round(44*w/32),x1-I,yb-I,32,44)
    im.save(f'{outdir}/{name}.png'); print(name,im.size)
