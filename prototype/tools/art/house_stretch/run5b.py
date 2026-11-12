import sys; sys.path.insert(0,'/tmp/hs')
from region import *
from PIL import Image, ImageDraw
D='/mnt/user-data/outputs/'
UP=[(372,455),(420,420),(470,415),(470,490),(372,528)]
LO=[(314,650),(360,622),(402,612),(402,676),(314,720)]
def footpt(im):
    a=np.array(im)[...,3]>128; ys=np.where(a.any(1))[0]; yb=ys.max(); xs=np.where(a[yb-3:yb+1].any(0))[0]; return xs.mean(),yb
def paste(o,im,wp,wdx,pad=int(round(310*0.52))+6):
    a=np.array(im); m=Image.new('L',im.size,0); ImageDraw.Draw(m).polygon(wp,fill=255)
    wa=a.copy(); wa[np.array(m)==0]=0
    wl=Image.new('RGBA',o.size,(0,0,0,0)); wdy=-int(round(wdx*0.52)); wl.paste(Image.fromarray(wa),(wdx,pad+wdy),Image.fromarray(wa)); o.alpha_composite(wl); return o
ims=[st.ld(D+f'draft/houses/v2/s5b_{r}.png') for r in range(4)]
fr=footpt(ims[0]); outs=[]
for r,im in enumerate(ims):
    f=footpt(im); dx=int(round(f[0]-fr[0])); dy=int(round(f[1]-fr[1])); sh=lambda P:[(x+dx,y+dy) for x,y in P]
    o=stretch_multi(im,[dict(c=312+dx,bL=285+dx,blend=7),dict(c=368+dx,bL=330+dx,blend=0),dict(c=417+dx,bL=406+dx,blend=0)],[(405+dx,385+dy),(406+dx,531+dy)])
    o=paste(o,im,sh(LO),207); o=paste(o,im,sh(UP),-40); o=paste(o,im,sh(UP),135)
    o=o.crop(o.getbbox()); o.save(f'r5b_{r}.png'); outs.append(o); print(r,im.size,(dx,dy),o.size)
sc=0.42; ims2=[i.resize((int(i.width*sc),int(i.height*sc)),Image.LANCZOS) for i in outs]
c=Image.new('RGBA',(ims2[0].width*2+30,ims2[0].height*2+30),(120,160,110,255))
for k,i in enumerate(ims2): c.alpha_composite(i,(10+(k%2)*(ims2[0].width+10),10+(k//2)*(ims2[0].height+10)))
c.convert('RGB').save('r5b_set.jpg',quality=85)
