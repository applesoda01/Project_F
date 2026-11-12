# 민가 1×1·1×2 배율 정리·패키징 (2026-10-28). 1×1 표시 폭 110px, 2배 저장, 앞 모서리(벽 밑 꼭짓점) 기준 정렬
from PIL import Image
import numpy as np, json, os, sys
K2 = 220/574          # 2배 저장 배율 (1×1 몸체 폭 574px → 220px, 표시 110px)
OUT = sys.argv[1]   # 사용: docs/art/town_ref/houses 에서 python pack_houses.py <출력폴더>
# 저장 후 imagequant(품질 85~98, dithering 0.8)로 PNG 양자화: 5.4MB → 1.9MB
SETS = [  # (size, look, floors, src pattern)
 ("1x1","s1",1,"base_1x1/h1_{}.png"),
 ("1x1","s2",1,"base_1x1/h2_{}.png"),
 ("1x1","s3",1,"base_1x1/h3_{}.png"),
 ("1x1","s3",2,"base_1x1/v2/s3b_{}.png"),
 ("1x1","s5",1,"base_1x1/h5_{}.png"),
 ("1x1","s5",2,"base_1x1/v2/s5b_{}.png"),
 ("1x2","s2",1,"long/h2L_{}.png"),
 ("1x2","s3",1,"long/h3L_{}.png"),
 ("1x2","s3",2,"long/h3bL_{}.png"),
 ("1x2","s5",1,"long/h5L_{}.png"),
 ("1x2","s5",2,"long/h5bL_{}.png"),
]
def anchor(a):
    m=a>128; ys,xs=np.nonzero(m); yb=ys.max(); xb=xs[ys>=yb-2]
    return (xb.min()+xb.max())/2+0.5, yb+1.0   # 앞 모서리(벽 밑 꼭짓점) 바닥
man={"scale_store":2,"draw_scale":0.5,"note":"ax,ay = 앞 모서리 바닥점(파일 픽셀). 그리기: drawImage(img, X-ax*0.5, Y-ay*0.5, w*0.5, h*0.5)","sets":{}}
for size,look,fl,pat in SETS:
    items=[]
    for c in range(4):
        im=Image.open(pat.format(c)).convert("RGBA"); a=np.array(im)[:,:,3]
        bb=im.getchannel("A").getbbox(); im=im.crop(bb); ax,ay=anchor(a); ax-=bb[0]; ay-=bb[1]
        w,h=im.size; nw,nh=round(w*K2),round(h*K2)
        sm=im.convert("RGBa").resize((nw,nh),Image.LANCZOS).convert("RGBA")
        items.append((sm,ax*nw/w,ay*nh/h))
    # 4색을 같은 캔버스·같은 앵커로 맞춤
    L=max(i[1] for i in items); R=max(i[0].width-i[1] for i in items)
    T=max(i[2] for i in items); B=max(i[0].height-i[2] for i in items)
    W=int(np.ceil(L+R))+2; H=int(np.ceil(T+B))+1; AX=round(L)+1; AY=round(T)
    key=f"{size}_{look}_f{fl}"
    for c,(sm,ax,ay) in enumerate(items):
        cv=Image.new("RGBA",(W,H),(0,0,0,0)); cv.alpha_composite(sm,(round(AX-ax),round(AY-ay)))
        cv.save(f"{OUT}/houses/{key}_c{c}.png",optimize=True)
    man["sets"][key]={"w":W,"h":H,"ax":AX,"ay":AY,"files":[f"town/houses/{key}_c{c}.png" for c in range(4)]}
    print(key,W,H,AX,AY)
json.dump(man,open(f"{OUT}/houses/houses.json","w"),ensure_ascii=False,indent=1)
