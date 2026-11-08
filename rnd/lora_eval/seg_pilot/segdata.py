import sys,os,random,json,numpy as np,cv2
sys.path.insert(0,'/tmp/mq12')
from mixlib import *
from gen_mix import G,IDS
from asm import ORDER
CLS=list(ORDER)  # class id = index+1
def leftlab(parts,target=968,thr=40):
    L=comp_left(parts,ORDER);ys,xs=np.where(L[:,:,3]>thr)
    if len(ys)==0: return None
    x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    lab=np.zeros((OH,OW),np.uint8)
    for n in ORDER:
        if n not in parts: continue
        p=parts[n];c=p['img'];h,w=c.shape[:2];x,y=p['x'],p['y']
        ya=max(y,0);xa=max(x,0);yb=min(y+h,OH);xb=min(x+w,OW)
        if yb<=ya or xb<=xa: continue
        m=c[ya-y:yb-y,xa-x:xb-x,3]>=128
        lab[ya:yb,xa:xb][m]=ORDER.index(n)+1
    sc=target/(y1-y0);crop=L[y0:y1,x0:x1]
    big=cv2.resize(crop,None,fx=sc,fy=sc,interpolation=cv2.INTER_LANCZOS4)
    bl=cv2.resize(lab[y0:y1,x0:x1],(big.shape[1],big.shape[0]),interpolation=cv2.INTER_NEAREST)
    bh,bw=big.shape[:2];ox=int(round(512-bw/2));oy=int(round(512-bh/2))
    img=np.full((1024,1024,3),255,np.float32);lb=np.zeros((1024,1024),np.uint8)
    ob=over((255,255,255),np.clip(big,0,255))
    ya,xa=max(oy,0),max(ox,0);yb,xb=min(oy+bh,1024),min(ox+bw,1024)
    img[ya:yb,xa:xb]=ob[ya-oy:yb-oy,xa-ox:xb-ox];lb[ya:yb,xa:xb]=bl[ya-oy:yb-oy,xa-ox:xb-ox]
    return np.clip(img,0,255).astype(np.uint8),lb
R=256
def make(args):
    k,src=args
    parts=gather(dict(src));r=leftlab(parts)
    if r is None: return None
    img,lb=r
    return k,cv2.resize(img,(R,R),interpolation=cv2.INTER_AREA),cv2.resize(lb,(R,R),interpolation=cv2.INTER_NEAREST)
def combos(ids,N,seed):
    rnd=random.Random(seed);out=[]
    while len(out)<N:
        a,b,c=rnd.sample(ids,3);mode=rnd.random()
        if mode<0.5: src={'hair':a,'head':a,'body':b,'arms':b,'legs':c,'acc':a}
        elif mode<0.8: src={'hair':a,'head':b,'body':c,'arms':c,'legs':b,'acc':b}
        elif mode<0.9: src={g:a for g in G}  # 원본 그대로
        else: d=rnd.choice(ids);src={'hair':a,'head':b,'body':c,'arms':d,'legs':c,'acc':a}
        m={}
        for g,ch in src.items():
            for n in G[g]: m[n]=ch
        out.append((len(out),m))
    return out
if __name__=='__main__':
    from multiprocessing import Pool
    ntr,nva=int(sys.argv[1]),int(sys.argv[2]);val=IDS[-15:];tr=IDS[:-15]
    for name,ids,n,seed in(('val',val,nva,7),('train',tr,ntr,11)):
        with Pool(2) as p: res=[r for r in p.imap(make,combos(ids,n,seed),chunksize=8) if r]
        np.savez_compressed(f'/tmp/mq12/seg/{name}.npz',x=np.stack([r[1] for r in res]),y=np.stack([r[2] for r in res]))
        print(name,len(res),flush=True)
