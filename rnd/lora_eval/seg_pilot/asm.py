import numpy as np, cv2, re
OW,OH=455,456
def parse(path):
    L=open(path,encoding='utf8').read().split('\n'); P={}; i=0
    while i<len(L):
        if L[i] and not L[i].startswith(' ') and i+1<len(L) and 'rotate' in L[i+1]:
            d={}
            for k in range(1,7):
                if ':' in L[i+k]: a,b=L[i+k].split(':',1); d[a.strip()]=b.strip()
            P[L[i].strip()]=d; i+=7
        else: i+=1
    return P
ORDER=['tail','tailB','acce03','hairTwinB','hairB','headB','armB','handB','legB','thighB','legF','thighF','skirtB','body','skirtF','head','faceNormal','hairSideB','hairF','hairTwinF','hairSideF','acce02','acce01','armF','handF','hipF']
def assemble(id,order=ORDER):
    P=parse(f'chars/{id}/{id}.atlas'); at=cv2.imread(f'chars/{id}/{id}.png',cv2.IMREAD_UNCHANGED)
    def get(n):
        x,y=map(int,P[n]['xy'].split(','));w,h=map(int,P[n]['size'].split(',')); rot=P[n]['rotate']=='true'
        return np.ascontiguousarray(np.rot90(at[y:y+w,x:x+h],-1)) if rot else at[y:y+h,x:x+w].copy()
    cv=np.full((OH,OW,3),255,np.float32); used=[]
    for n in order:
        if n not in P or P[n]['size']=='1, 1': continue
        c=get(n); h,w=c.shape[:2]; ox,oy=map(int,P[n]['offset'].split(',')); x=ox; y=OH-oy-h; used.append(n)
        a_=c[:,:,3:4]/255.0; y0=max(y,0); x0=max(x,0); y1=min(y+h,OH); x1=min(x+w,OW)
        cs=c[y0-y:y1-y,x0-x:x1-x]; a2=a_[y0-y:y1-y,x0-x:x1-x]; cv[y0:y1,x0:x1]=cv[y0:y1,x0:x1]*(1-a2)+cs[:,:,:3]*a2
    return cv.astype(np.uint8),used,P,get
