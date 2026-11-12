import sys; sys.path.insert(0,'/tmp/lina/bb')
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import convex_hull_image
def hullsides(m):
    out=np.zeros_like(m)
    for side in (0,1):
        t=m.copy()
        if side==0: t[:,split:]=0
        else: t[:,:split]=0
        if t.any(): out|=convex_hull_image(t)
    return out
from proc2 import load2
H=Image.open('/mnt/user-data/outputs/hair2_inputs/hair_전체_레이어.png').convert('RGBA')
ha=Image.new('L',(1684,2528),0); ha.paste(H.split()[3],(450,40)); ha=np.array(ha)>20
y0,y1,x0,x1=281,401,707,937; split=123
def comps(img):
    c=img[y0:y1,x0:x1].astype(int); L=c@[.299,.587,.114]
    ink=ndi.binary_opening((L<185)&(~ha[y0:y1,x0:x1]))
    lab,k=ndi.label(ink,np.ones((3,3))); return ink,lab,k
def eye_of(img,minsz=100):
    ink,lab,k=comps(img)
    cs=[(i,ndi.center_of_mass(lab==i),(lab==i).sum()) for i in range(1,k+1) if (lab==i).sum()>=100]
    brow=[]
    for side in (0,1):
        c=[a for a in cs if (a[1][1]<split)==(side==0)]
        if not c: continue
        b=min(c,key=lambda a:a[1][0])
        if b[1][0]<=40: brow.append(b[0])
    keep=[i for i in range(1,k+1) if (lab==i).sum()>=minsz and i not in brow]
    return np.isin(lab,keep),ink,lab

def base_eye(base):
    e0,_,_=eye_of(base,400)
    c=base[y0:y1,x0:x1].astype(int)
    scl=(c.min(2)>200)&((c[...,0]-c[...,2])<16)&~ha[y0:y1,x0:x1]
    lab,k=ndi.label(scl|ndi.binary_dilation(e0,iterations=2),np.ones((3,3)))
    ids=np.unique(lab[ndi.binary_dilation(e0,iterations=1)]); ids=ids[ids>0]
    return e0|(np.isin(lab,ids)&scl)
def comp_dummy(): pass
def compose(base,frame):
    e0=base_eye(base); ek_all,_,labk=eye_of(frame,100)
    M0=ndi.binary_dilation(hullsides(ndi.binary_dilation(e0,iterations=1)),iterations=2)
    # top limit per side
    lim=np.zeros(x1-x0,int)
    for side in (0,1):
        sl=slice(0,split) if side==0 else slice(split,x1-x0)
        rows=np.where(e0[:,sl].any(1))[0]; lim[sl]=rows.min()-2
    # video eye comps: those whose pixels mostly below limit and near M0
    near=ndi.binary_dilation(M0,iterations=8)
    ek=np.zeros_like(e0)
    lab,k=ndi.label(ek_all,np.ones((3,3)))
    for i in range(1,k+1):
        m=lab==i
        if m.sum()<40: continue
        ys,xs=np.where(m)
        if near[ys,xs].mean()>0.8 and (ys>=lim[xs]).mean()>0.9: ek|=m
    Mk=ndi.binary_dilation(hullsides(ek),iterations=2)
    M=M0|Mk
    rr=np.arange(y1-y0)[:,None]
    M&=(rr>=lim[None,:])
    M&=~ndi.binary_dilation(ha[y0:y1,x0:x1],iterations=1)
    ring=ndi.binary_dilation(M,iterations=10)&~ndi.binary_dilation(M,iterations=3)&~comps(base)[0]&~ha[y0:y1,x0:x1]
    off=(base[y0:y1,x0:x1][ring].astype(float).mean(0)-frame[y0:y1,x0:x1][ring].astype(float).mean(0))
    mk=cv2.GaussianBlur(M.astype(np.float32),(0,0),1.3)
    g=base.astype(float).copy()
    fr=np.clip(frame[y0:y1,x0:x1].astype(float)+off,0,255)
    g[y0:y1,x0:x1]=fr*mk[...,None]+g[y0:y1,x0:x1]*(1-mk[...,None])
    return g.round().astype(np.uint8),M

def closed(base,frame):
    e0=base_eye(base); ek_all,_,_=eye_of(frame,100)
    M0=ndi.binary_dilation(hullsides(ndi.binary_dilation(e0,iterations=1)),iterations=2)
    lim=np.zeros(x1-x0,int)
    for side in (0,1):
        sl=slice(0,split) if side==0 else slice(split,x1-x0)
        rows=np.where(e0[:,sl].any(1))[0]; lim[sl]=rows.min()-2
    near=ndi.binary_dilation(M0,iterations=8)
    lab,k=ndi.label(ek_all,np.ones((3,3))); ek=np.zeros_like(e0)
    for i in range(1,k+1):
        m=lab==i
        if m.sum()<40: continue
        ys,xs=np.where(m)
        side=0 if xs.mean()<split else 1
        sl=slice(0,split) if side==0 else slice(split,x1-x0)
        rws=np.where(e0[:,sl].any(1))[0]; thr=rws.min()+0.55*(rws.max()-rws.min())
        if near[ys,xs].mean()>0.8 and ys.mean()>=thr: ek|=m
    hairl=ndi.binary_dilation(ha[y0:y1,x0:x1],iterations=1)
    rr=np.arange(y1-y0)[:,None]
    Mfill=(M0|ndi.binary_dilation(ek,iterations=4))&(rr>=lim[None,:])&~hairl
    b=base[y0:y1,x0:x1].astype(np.float32)
    ink_b=comps(base)[0]
    Lb=b@np.array([.299,.587,.114],np.float32)
    valid=(~ndi.binary_dilation(Mfill,iterations=2)&~ndi.binary_dilation(Lb<215,iterations=1)&~hairl).astype(np.float32)
    skin=None; done=np.zeros(valid.shape,bool)
    for sg in (5,9,16,30,60):
        num=cv2.GaussianBlur(b*valid[...,None],(0,0),sg); den=cv2.GaussianBlur(valid,(0,0),sg)[...,None]
        cur=num/np.maximum(den,1e-6)
        if skin is None: skin=cur.copy(); done=(den[...,0]>0.08)
        else:
            use=(~done)&(den[...,0]>0.08); skin[use]=cur[use]; done|=use
    skin[~done]=skin[done].mean(0)
    fm=cv2.GaussianBlur(Mfill.astype(np.float32),(0,0),1.2)[...,None]
    out=b*(1-fm)+skin*fm
    # lashes from video
    f=frame[y0:y1,x0:x1].astype(np.float32); Lf=f@np.array([.299,.587,.114],np.float32)
    region=ndi.binary_dilation(ek,iterations=2)&~hairl
    a=np.clip((215-Lf)/110,0,1)*region
    a=cv2.GaussianBlur(a,(0,0),0.6)[...,None]
    out=out*(1-a)+f*a
    g=base.copy(); g[y0:y1,x0:x1]=out.round().astype(np.uint8)
    return g

def half(base,frame):
    e0=base_eye(base); ek,_,_=eye_of(frame,300)
    M0=ndi.binary_dilation(hullsides(ndi.binary_dilation(e0,iterations=1)),iterations=2)
    near=ndi.binary_dilation(M0,iterations=4)
    lab,k=ndi.label(ek,np.ones((3,3))); ekk=np.zeros_like(ek)
    for i in range(1,k+1):
        m=lab==i; ys,xs=np.where(m)
        if near[ys,xs].mean()>0.9: ekk|=m
    Mk=ndi.binary_dilation(hullsides(ekk),iterations=1)
    hairl=ndi.binary_dilation(ha[y0:y1,x0:x1],iterations=1)
    Mfill=(M0|ndi.binary_dilation(Mk,iterations=3))&~hairl
    b=base[y0:y1,x0:x1].astype(np.float32); Lb=b@np.array([.299,.587,.114],np.float32)
    valid=(~ndi.binary_dilation(Mfill,iterations=2)&~ndi.binary_dilation(Lb<215,iterations=1)&~hairl).astype(np.float32)
    skin=None
    for sg in (5,9,16,30,60):
        num=cv2.GaussianBlur(b*valid[...,None],(0,0),sg); den=cv2.GaussianBlur(valid,(0,0),sg)[...,None]
        cur=num/np.maximum(den,1e-6)
        if skin is None: skin=cur.copy(); done=(den[...,0]>0.08)
        else:
            use=(~done)&(den[...,0]>0.08); skin[use]=cur[use]; done|=use
    skin[~done]=skin[done].mean(0)
    fm=cv2.GaussianBlur(Mfill.astype(np.float32),(0,0),1.2)[...,None]
    out=b*(1-fm)+skin*fm
    f=frame[y0:y1,x0:x1].astype(np.float32)
    # color offset from inside-eye white? use skin ring offset
    ring=ndi.binary_dilation(Mk,iterations=8)&~ndi.binary_dilation(Mk,iterations=3)&(Lb>215)&~hairl
    off=(skin[ring].mean(0)-f[ring].mean(0)) if ring.any() else 0
    f=np.clip(f+off,0,255)
    pm=cv2.GaussianBlur((Mk&~hairl).astype(np.float32),(0,0),1.0)[...,None]
    out=out*(1-pm)+f*pm
    g=base.copy(); g[y0:y1,x0:x1]=out.round().astype(np.uint8)
    return g
