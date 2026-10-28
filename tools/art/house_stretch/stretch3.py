import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
D='/mnt/user-data/outputs/'
SL=0.52
POLY=[(373,68),(410,56),(450,70),(450,92),(445,100),(443,152),(412,174),(384,158),(382,102),(372,92)]
def ld(p):
    i=Image.open(p).convert('RGBA'); return i.crop(i.getbbox())
WPOLY=[(333,404),(368,389),(368,449),(333,466)]
def stretch(im, c=436, bL=388, L=310, chim_shift=155, poly=POLY, blend=7, wpolys=None, wdx=214, insh=(-90,47)):
    W,H=im.size; a=np.array(im)
    base=a.copy()
    if poly:
        m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255)
        mk=np.array(m.filter(ImageFilter.MaxFilter(5)))>0
        chim=a.copy(); chim[~mk]=0
        sx,sy=insh
        ys,xs=np.where(mk); base[ys,xs]=a[ys+sy,xs+sx]
    p=c-bL; pad=int(round(L*SL))+6; OW=W+L; OH=H+pad
    Y,X=np.mgrid[0:OH,0:OW]
    def samp(kind,n=0):
        if kind=='L': xx=X; yy=Y-pad
        elif kind=='R': xx=X-L; yy=Y-pad+int(round(L*SL))
        else: xx=X-n*p; yy=Y-pad+int(round(n*p*SL))
        ok=(xx>=0)&(xx<W)&(yy>=0)&(yy<H)
        out=np.zeros((OH,OW,4),float); out[ok]=base[yy[ok],xx[ok]]; return out
    nmax=int((c+L-bL)//p)+1
    # layers and boundaries
    layers=[samp('L')]+[samp('G',n) for n in range(1,nmax+1)]+[samp('R')]
    bounds=[c]+[bL+n*p for n in range(2,nmax+1) if bL+n*p<c+L]+[c+L]
    # layer index per column: L for x<c; G_n for bound segment; R after c+L
    # build with weights
    xs=np.arange(OW)
    idx=np.zeros(OW,int)
    for k,b in enumerate(bounds): idx[xs>=b]=k+1
    # idx k -> layers[k]; mapping: 0:L,1..: G_1.. but G n increments at bL+n*p
    # gap segments: x in [c,bL+2p)->n=1 ... ensure mapping consistent
    lay=np.zeros(OW,int)
    for x in range(OW):
        if x<c: lay[x]=0
        elif x>=c+L: lay[x]=nmax+1
        else: lay[x]=(x-bL)//p
    out=np.zeros((OH,OW,4),float)
    for x in range(OW): out[:,x]=layers[lay[x]][:,x]
    # crossfade at changes
    for x in range(1,OW):
        if blend>0 and lay[x]!=lay[x-1]:
            for dx in range(-blend,blend):
                xx=x+dx
                if 0<=xx<OW:
                    t=(dx+blend+0.5)/(2*blend)
                    A=layers[lay[x-1]][:,xx]; B=layers[lay[x]][:,xx]
                    # alpha-weighted blend
                    wa=(1-t)*A[:,3:4]/255+1e-6; wb=t*B[:,3:4]/255+1e-6
                    col=(A[:,:3]*wa+B[:,:3]*wb)/(wa+wb)
                    al=(1-t)*A[:,3]+t*B[:,3]
                    out[:,xx,:3]=col; out[:,xx,3]=al
    o=Image.fromarray(out.round().astype(np.uint8))
    if poly:
        cm=Image.fromarray(chim); dx=chim_shift; dy=-int(round(dx*SL))
        layer=Image.new('RGBA',o.size,(0,0,0,0)); layer.paste(cm,(dx,pad+dy)); o.alpha_composite(layer)
    for wp in (wpolys if wpolys is not None else [WPOLY]):
        wm=Image.new('L',(W,H),0); ImageDraw.Draw(wm).polygon(wp,fill=255)
        wa=a.copy(); wa[np.array(wm)==0]=0
        wl=Image.new('RGBA',o.size,(0,0,0,0)); wdy=-int(round(wdx*SL)); wl.paste(Image.fromarray(wa),(wdx,pad+wdy),Image.fromarray(wa)); o.alpha_composite(wl)
    return o
if __name__=='__main__':
    for r in range(4):
        im=ld(D+f'draft/houses/h3_{r}.png'); o=stretch(im); o=o.crop(o.getbbox()); o.save(f'str2_{r}.png'); print(r,o.size)
    ims=[Image.open(f'str2_{r}.png') for r in range(4)]
    sc=0.5; ims=[i.resize((int(i.width*sc),int(i.height*sc)),Image.LANCZOS) for i in ims]
    c=Image.new('RGBA',(ims[0].width*2+30,ims[0].height*2+30),(120,160,110,255))
    for k,i in enumerate(ims): c.alpha_composite(i,(10+(k%2)*(ims[0].width+10),10+(k//2)*(ims[0].height+10)))
    c.convert('RGB').save('str2_set.jpg',quality=85)
