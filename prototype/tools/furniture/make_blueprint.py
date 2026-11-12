from PIL import Image, ImageDraw, ImageFont
import math, os
E=math.radians(15); SN,CS=math.sin(E),math.cos(E)
SS=4; LW=3  # 4배 그려서 줄임, 선 굵기 3px(최종)
FK="/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
def mk(w,h): 
    im=Image.new("RGB",(w*SS,h*SS),"white"); return im,ImageDraw.Draw(im)
def P(x,y): return (x*SS,y*SS)
def poly(d,pts,fill="white"): d.polygon([P(*p) for p in pts],fill=fill,outline="black",width=LW*SS)
def line(d,a,b): d.line([P(*a),P(*b)],fill="black",width=LW*SS)
def ell(d,cx,cy,rx,ry,fill="white"): d.ellipse([P(cx-rx,cy-ry),P(cx+rx,cy+ry)],fill=fill,outline="black",width=LW*SS)
def cyl(d,cx,yc,R,th):  # yc=윗면 중심 y, th=화면상 높이(세로 두께)
    ry=R*SN
    ell(d,cx,yc+th,R,ry)
    d.rectangle([P(cx-R+LW/2,yc),P(cx+R-LW/2,yc+th)],fill="white")
    line(d,(cx-R,yc),(cx-R,yc+th)); line(d,(cx+R,yc),(cx+R,yc+th))
    ell(d,cx,yc,R,ry)
def finish(im,w,h): return im.resize((w,h),Image.LANCZOS)

# ---------- 탁자 (640x400, @2x) ----------
def table():
    W,H=640,400; im,d=mk(W,H); cx=320; yb=392
    Rb=96; tb=14; Rt=180; tt=18; Htop=260
    y0=yb-Rb*SN                      # 바닥 중심
    # 받침 원반
    cyl(d,cx,y0-tb*CS-0,Rb,tb*CS)    # 윗면 중심 y = 바닥중심 - 두께
    ytb=y0-tb*CS                     # 받침 윗면 중심
    ytop=y0-Htop*CS                  # 탁자 윗면 중심
    yun=ytop+tt*CS                   # 탁자 아랫면 중심
    # 기둥
    poly(d,[(cx-26,ytb),(cx+26,ytb),(cx+18,yun),(cx-18,yun)])
    # 기둥 위 둥근 장식 띠
    line(d,(cx-23,ytb-26),(cx+23,ytb-26))
    # 윗판
    cyl(d,cx,ytop,Rt,tt*CS)
    ell(d,cx,ytop,Rt-16,(Rt-16)*SN,fill=None) if False else d.ellipse([P(cx-Rt+16,ytop-(Rt-16)*SN),P(cx+Rt-16,ytop+(Rt-16)*SN)],outline="black",width=2*SS)
    return finish(im,W,H),dict(cx=cx,yb=yb,ytop=ytop,Rt=Rt,ry=Rt*SN)

# ---------- 의자 (192x256, @2x) ----------
Wc,Dc=112,100
def boxes():
    b=[]  # (x0,x1,z0,z1,h0,h1)
    lw=14
    for sx in(-1,1):
        for sz in(-1,1):
            x0=sx*(Wc/2-lw/2)-lw/2; z0=sz*(Dc/2-lw/2-2)-lw/2
            top=200 if sz<0 else 88   # 뒷다리는 등받이 기둥까지 연장
            b.append((x0,x0+lw,z0,z0+lw,0,top))
    b.append((-Wc/2,Wc/2,-Dc/2+14,Dc/2,88,102))              # 좌석
    for h0,h1 in((114,134),(146,166),(178,198)):             # 등받이 살
        b.append((-Wc/2+14,Wc/2-14,-Dc/2+2,-Dc/2+12,h0,h1))
    return b
def chair(view):
    W,H=192,256; im,d=mk(W,H); yb=250; y0=yb-(Dc/2)*SN; cx=W/2
    items=[]
    for x0,x1,z0,z1,h0,h1 in boxes():
        if view=="front": a=(x0,x1,z0,z1)
        elif view=="back": a=(-x1,-x0,-z1,-z0)
        else: a=(z0,z1,-x1,-x0)           # 옆: 의자 앞쪽이 오른쪽
        items.append((a[3],h0,a[0],a[1],a[2],a[3],h0,h1))
    items.sort(key=lambda t:(round(t[0],3),t[1]))
    for _,_,x0,x1,z0,z1,h0,h1 in items:
        Y=lambda h,z:y0-h*CS+z*SN
        # 앞면
        poly(d,[(cx+x0,Y(h1,z1)),(cx+x1,Y(h1,z1)),(cx+x1,Y(h0,z1)),(cx+x0,Y(h0,z1))])
        # 윗면
        poly(d,[(cx+x0,Y(h1,z0)),(cx+x1,Y(h1,z0)),(cx+x1,Y(h1,z1)),(cx+x0,Y(h1,z1))])
    return finish(im,W,H),dict(cx=cx,yb=yb)

def annotate(img,info,kind):
    a=img.convert("RGB"); d=ImageDraw.Draw(a)
    f=ImageFont.truetype(FK,12,index=1)
    d.line((0,info["yb"],a.width,info["yb"]),fill=(230,120,30),width=1)
    d.line((info["cx"],0,info["cx"],a.height),fill=(120,170,230),width=1)
    d.text((4,info["yb"]+2),"발밑선",font=f,fill=(230,120,30))
    if kind=="table":
        d.text((4,4),"윗면 타원 세로÷가로 = 0.26 (정면 15°)",font=f,fill=(30,130,60))
    return a
out="out"; os.makedirs(out,exist_ok=True)
t,ti=table(); t.save(f"{out}/table_blueprint_640x400.png")
annotate(t,ti,"table").save(f"{out}/table_blueprint_annotated.png")
cs={}
for v in("front","back","side"):
    c,ci=chair(v); cs[v]=c; c.save(f"{out}/chair_{v}_blueprint_192x256.png")
# 의자 3방향 한 장 (같은 발밑선, 2배 확대 576x256 -> 1152x512)
sheet=Image.new("RGB",(576,256),"white")
for i,v in enumerate(("front","back","side")): sheet.paste(cs[v],(i*192,0))
sheet.resize((1152,512),Image.LANCZOS).save(f"{out}/chairs_blueprint_sheet.png")
sa=annotate(sheet,dict(cx=96,yb=250),"chair"); sa.resize((1152,512),Image.LANCZOS).save(f"{out}/chairs_blueprint_sheet_annotated.png")
# 반전(검은 바탕 흰 선): ControlNet canny용
from PIL import ImageOps
for fn in os.listdir(out):
    if fn.endswith(".png") and "annotated" not in fn and "inverted" not in fn:
        im=Image.open(f"{out}/{fn}").convert("L"); ImageOps.invert(im).save(f"{out}/inverted_{fn}")
print(sorted(os.listdir(out)))
