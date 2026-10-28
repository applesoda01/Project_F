from PIL import Image, ImageDraw, ImageFont
import numpy as np
D='/mnt/user-data/outputs/'
def ld(p):
    i=Image.open(p).convert('RGBA'); return i.crop(i.getbbox())
def foot(im):
    a=np.array(im)[...,3]>128; ys=np.where(a.any(1))[0]; yb=ys.max()
    return np.where(a[yb-3:yb+1].any(0))[0].mean()
W,H=2752,1536; CW,CH=W//2,H//2
c=Image.new('RGBA',(W,H),(255,0,255,255)); d=ImageDraw.Draw(c)
TW=440; TH=220
roofs=[0,1,2,3]
Y=(255,235,0,255); K=(20,20,20,255); G=(255,255,255,90)
def cell(ix,iy,col):
    ox0=ix*CW; oy0=iy*CH
    # tile grid centred for slot: tiles (gx,gy-1),(gx,gy)
    bx=ox0+CW*0.60; by=oy0+CH*0.80   # bottom vertex of front tile
    def P(dx,dy): return (bx+dx,by+dy)
    # ground diamonds: front tile and the one up-right
    def dia(cx,cy,fill=None,outline=Y,w=4):
        pts=[(cx,cy),(cx+TW/2,cy-TH/2),(cx,cy-TH),(cx-TW/2,cy-TH/2)]
        d.polygon(pts,fill=fill,outline=outline,width=w)
    # tile A (front) bottom vertex at (bx,by); tile B shifted up-right by (TW/2,-TH/2)
    dia(bx,by); dia(bx+TW/2,by-TH/2)
    # wireframe prism over the 2-tile union
    wh=0.28*TW; apex=0.62*TW
    A=(bx,by); L=(bx-TW/2,by-TH/2); Bk=(bx-TW/2+TW,by-TH/2-TH/2*1) # placeholder
    # union footprint corners: front (bx,by); left (bx-TW/2,by-TH/2); back (bx,by-TH) wait recompute
    front=(bx,by); left=(bx-TW/2,by-TH/2); right=(bx+TW,by-TH); back=(bx+TW/2,by-TH*1.5)
    # long wall front-right face: front->right ; gable face: left->front
    def up(p,h): return (p[0],p[1]-h)
    for a,b in [(front,left),(front,right),(left,back),(right,back)]: pass
    # eave box
    for p,q in [(front,left),(front,right),(left,up(left,wh)),(front,up(front,wh)),(right,up(right,wh)),(up(front,wh),up(left,wh)),(up(front,wh),up(right,wh)),(up(left,wh),up(left,wh))]:
        d.line([p,q],fill=K,width=5)
    # gable apex at front gable (mid of front-left edge) and mid of right-back edge ; ridge along long axis
    gm=((front[0]+left[0])/2,(front[1]+left[1])/2); gm2=((right[0]+back[0])/2,(right[1]+back[1])/2)
    r1=up(gm,apex); r2=up(gm2,apex)
    for p,q in [(up(front,wh),r1),(up(left,wh),r1),(r1,r2),(up(right,wh),r2)]:
        d.line([p,q],fill=(200,0,0,255),width=5)
    # axes labels
    f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',34)
    d.text((front[0]-70,front[1]+14),'FRONT',fill=K,font=f)
    d.text((left[0]-130,left[1]+10),'GABLE',fill=K,font=f)
    d.text((right[0]-250,right[1]+10),'LONG WALL',fill=K,font=f)
    # 1x1 reference at left on its own tile
    sp=ld(D+f'draft/houses/h3_{col}.png'); s=TW*0.92/sp.width
    sp=sp.resize((int(sp.width*s),int(sp.height*s)),Image.LANCZOS)
    rx=ox0+CW*0.18; ry=oy0+CH*0.80
    dia(rx,ry)
    c.alpha_composite(sp,(int(rx-foot(sp)),int(ry-sp.height)))
    d.text((rx-110,ry+14),'1x1 REFERENCE',fill=K,font=f)
for i,col in enumerate([1,3,0,2]): cell(i%2,i//2,col)
c.convert('RGB').save(D+'prototype_assets_draft/houses_long_v2/guide_1x2_blueprint.png')
print(c.size)
