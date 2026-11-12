import cv2,numpy as np,subprocess,os
from PIL import Image
names=['1_기본','2_진지','3_웃음','4_걱정','5_곤란','6_놀람']
s=768/460
def prep(i):
    base=np.asarray(Image.open(f'/mnt/user-data/outputs/bald_final/bald_{names[i-1]}.png').convert('RGB'))
    start=cv2.resize(base[150:610,610:1070],(768,768),interpolation=cv2.INTER_LANCZOS4)
    return base,start
def load2(i,k):
    d=f'/tmp/lina/bb/f_{i}_{k}';base,start=prep(i)
    n=len([f for f in os.listdir(d) if f.endswith('.png')])
    sift=cv2.SIFT_create(4000)
    # mask out eye/brow zone (canvas y250-420,x690-960) in start coords
    mk=np.full((768,768),255,np.uint8);y0,y1,x0,x1=[int(v) for v in ((250-150)*s,(420-150)*s,(690-610)*s,(960-610)*s)];mk[y0:y1,x0:x1]=0
    k1,d1=sift.detectAndCompute(cv2.cvtColor(start,cv2.COLOR_RGB2GRAY),mk)
    A=np.array([[s,0,-610*s],[0,s,-150*s],[0,0,1]])
    W=[None];Ms=[None];inls=[]
    for j in range(1,n+1):
        fr0=cv2.imread(f'{d}/f{j:02d}.png');fr=cv2.GaussianBlur(fr0,(0,0),1.1)
        g=cv2.cvtColor(fr0,cv2.COLOR_BGR2GRAY);k2,d2=sift.detectAndCompute(g,None)
        m=cv2.BFMatcher().knnMatch(d1,d2,k=2);good=[a for a,b in m if a.distance<0.7*b.distance]
        src=np.float32([k1[x.queryIdx].pt for x in good]);dst=np.float32([k2[x.trainIdx].pt for x in good])
        M,inl=cv2.estimateAffinePartial2D(src,dst,ransacReprojThreshold=2.0);inls.append(int(inl.sum()))
        T=(np.vstack([M,[0,0,1]])@A)[:2]
        W.append(cv2.cvtColor(cv2.warpAffine(fr,T,(1684,2528),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE),cv2.COLOR_BGR2RGB))
    return base,W,inls
if __name__=='__main__':
    box=(slice(280,400),slice(716,928));low=(slice(430,640),slice(780,960))
    for i in range(1,7):
        for k in (0,1):
            base,W,inl=load2(i,k)
            ev=[float(np.abs(W[j][box].astype(int)-base[box].astype(int)).mean()) for j in range(1,26)]
            lo=[float(np.abs(W[j][low].astype(int)-base[low].astype(int)).mean()) for j in range(1,26)]
            print(i,k,'minInl',min(inl),'lowMax %.1f lowEnd %.1f'%(max(lo),lo[-1]),'ev',[round(e) for e in ev[::3]])
