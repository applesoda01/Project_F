import json,numpy as np,cv2,sys,os
sys.path.insert(0,'/tmp/mq12')
from asm import parse,OW,OH,ORDER
SPEC=json.load(open('/tmp/mq12/sheets150/template_spec.json'));S=SPEC['slots'];DRAW=SPEC['draw_order']
_c={}
def load(i):
    if i not in _c:
        _c[i]=(parse(f'/tmp/mq12/chars/{i}/{i}.atlas'),cv2.imread(f'/tmp/mq12/chars/{i}/{i}.png',cv2.IMREAD_UNCHANGED))
    return _c[i]
def part(i,n):
    P,at=load(i)
    if n not in P or P[n]['size']=='1, 1': return None
    x,y=map(int,P[n]['xy'].split(','));w,h=map(int,P[n]['size'].split(',')); rot=P[n]['rotate']=='true'
    c=np.ascontiguousarray(np.rot90(at[y:y+w,x:x+h],-1)) if rot else at[y:y+h,x:x+w].copy()
    c=cv2.cvtColor(c,cv2.COLOR_BGRA2RGBA)
    ox,oy=map(int,P[n]['offset'].split(','));return dict(img=c,x=ox,y=OH-oy-c.shape[0])
GROUP={}
def gather(src):  # src: {slot:charid}; 슬롯 밖 파츠(tailB 등)는 slot→charid 규칙으로 'tail' 출처를 따른다
    d={}
    for n in list(S)+[k for k in ORDER if k not in S]:
        if n not in src: src=dict(src,**{n:src.get('tail',next(iter(src.values())))})
        r=part(src[n],n)
        if r is not None and (r['img'][:,:,3]>8).sum()>3: d[n]=r
    return d
def comp_left(parts,order):
    cv=np.zeros((OH,OW,4),np.float32)
    for n in order:
        if n not in parts: continue
        p=parts[n];c=p['img'].astype(np.float32);h,w=c.shape[:2];x,y=p['x'],p['y']
        y0=max(y,0);x0=max(x,0);y1=min(y+h,OH);x1=min(x+w,OW)
        if y1<=y0 or x1<=x0: continue
        s=c[y0-y:y1-y,x0-x:x1-x];a=s[:,:,3:4]/255.;d=cv[y0:y1,x0:x1]
        da=d[:,:,3:4]/255.;oa=a+da*(1-a)
        rgb=(s[:,:,:3]*a+d[:,:,:3]*da*(1-a))/np.maximum(oa,1e-6)
        cv[y0:y1,x0:x1,:3]=rgb;cv[y0:y1,x0:x1,3:4]=oa*255
    return cv
def over(bg,rgba):
    a=rgba[:,:,3:4]/255.;return (rgba[:,:,:3]*a+np.array(bg,np.float32)*(1-a))
def build(parts,order=ORDER,interp=cv2.INTER_LANCZOS4,target=968,thr=40):
    sh=np.zeros((1152,2560,3),np.float32);sh[:,:1024]=255;sh[:,1024:]=245
    L=comp_left(parts,order);ys,xs=np.where(L[:,:,3]>thr)
    if len(ys)==0: return None
    x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    sc=target/(y1-y0);crop=L[y0:y1,x0:x1]
    big=cv2.resize(crop,None,fx=sc,fy=sc,interpolation=interp)
    bh,bw=big.shape[:2];ox=int(round(512-bw/2));oy=int(round(512-bh/2))
    ob=over((255,255,255),np.clip(big,0,255))
    ya,xa=max(oy,0),max(ox,0);yb,xb=min(oy+bh,1024),min(ox+bw,1024)
    sh[ya:yb,xa:xb]=ob[ya-oy:yb-oy,xa-ox:xb-ox]
    for n,p in parts.items():
        if n not in S: continue
        v=S[n];c=p['img'].astype(np.float32);b2=cv2.resize(c,None,fx=2,fy=2,interpolation=interp)
        ob=over((245,245,245),np.clip(b2,0,255));h,w=ob.shape[:2];X=1024+v['x'];Y=v['y']
        sh[Y:Y+h,X:X+w]=ob[:min(h,1152-Y),:min(w,2560-X)]
    return np.clip(sh,0,255).astype(np.uint8),sc
