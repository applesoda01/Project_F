# Gemini 블록 시트 → 32칸 도트 블록. 블록마다 따로 색을 묶고, 칸마다 가장 많은 색을 고름.
import sys; from PIL import Image; import numpy as np, collections
src=Image.open(sys.argv[1]).convert('RGB')
# 네 블록 전체를 함께 묶어 공통 팔레트를 만든다(블록끼리 색이 같아야 이음이 안 보임)
regions=[(124,393,610,1028),(812,417,1275,1028),(1477,508,1940,1028),(2142,508,2628,1028)]
strip=Image.new('RGB',(sum(r[2]-r[0] for r in regions),max(r[3]-r[1] for r in regions)),(255,255,255)); xx=0
for r in regions: strip.paste(src.crop(r),(xx,0)); xx+=r[2]-r[0]
NC=16; PALQ=strip.quantize(colors=NC,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE)
def grab(x0,y0,x1,y1,W,H,ncol=0):
    crop=src.crop((x0,y0,x1,y1)); q=crop.quantize(palette=PALQ,dither=Image.Dither.NONE)
    pal=np.array(q.getpalette()[:NC*3]).reshape(-1,3); Q=np.array(q)
    whites=set(int(i) for i in np.where(np.abs(pal-255).sum(1)<150)[0])
    out=np.zeros((H,W,4),np.uint8); sx=Q.shape[1]/W; sy=Q.shape[0]/H
    for j in range(H):
        for i in range(W):
            cell=Q[int(j*sy):int((j+1)*sy),int(i*sx):int((i+1)*sx)]
            c=collections.Counter(cell.ravel().tolist()).most_common(1)[0][0]
            out[j,i]=[0,0,0,0] if c in whites else list(pal[c])+[255]
    return Image.fromarray(out,'RGBA')
I=33
for name,(x0,x1,yt,yb) in {'gem_grass_a':(91,643,360,1061),'gem_grass_b':(779,1308,384,1061)}.items():
    w=(x1-x0)-2*I; H=44; grab(x0+I,yb-I-round(H*w/32),x1-I,yb-I,32,H,9).save(name+'.png')
for name,(x0,x1,yt,yb) in {'gem_dirt_a':(1444,1973,475,1061),'gem_dirt_b':(2109,2661,475,1061)}.items():
    grab(x0+I,yt+I,x1-I,yb-I,32,32,8).save(name+'.png')
