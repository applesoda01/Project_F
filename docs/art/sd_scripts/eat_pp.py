import sys,os,json,cv2,numpy as np
from PIL import Image
from scipy import ndimage
SRC,CLS,OUT=sys.argv[1:4]; os.makedirs(OUT,exist_ok=True)
REPO='/home/claude/project_f_latest/prototype/assets/lobby_iso/chr/'
SITN={'cleric_f':38,'rogue_f':49,'archer_m':43,'mage_m':44,'cleric_m':48,'rogue_m':43,'mage_f':46,'warrior_f':38,'archer_f':35,'warrior_m':35}
n=SITN[CLS]; sh=Image.open(REPO+CLS+'_sit.webp'); f=n-1
cell=np.array(sh.crop(((f%12)*180,(f//12)*175,(f%12)*180+180,(f//12)*175+175)))
big=np.array(Image.fromarray(cell).resize((720,700),Image.LANCZOS))
si=np.array(Image.open('/mnt/user-data/outputs/lobby_eat/start_in/'+CLS+'.png').convert('RGB')).astype(int)
msi=np.abs(si-np.array([255,0,255])).sum(2)>90; mbig=big[...,3]>128
def cen(m): ys,xs=np.nonzero(m); return xs.mean(),ys.mean(),ys.max()-ys.min()
cx1,cy1,h1=cen(mbig); cx2,cy2,h2=cen(msi)
sc=h2/h1  # start_in px per orig px (≈1)
ox,oy=cx2-cx1*sc,cy2-cy1*sc
c=cv2.VideoCapture(SRC);fr=[]
while True:
    ok,x=c.read()
    if not ok:break
    fr.append(cv2.cvtColor(x,cv2.COLOR_BGR2RGB))
H0,W0=fr[0].shape[:2]; k=1024/W0
border=np.concatenate([fr[0][:6].reshape(-1,3),fr[0][:,:6].reshape(-1,3)]).astype(np.float32); bg=np.median(border,0)
def key(rgb):
    f=rgb.astype(np.float32);d=np.abs(f-bg).sum(2)
    al=np.clip((d-60)/(200-60),0,1);solid=al>=0.98
    idx=ndimage.distance_transform_edt(~solid,return_distances=False,return_indices=True)
    col=np.where(solid[...,None],f,f[idx[0],idx[1]])
    m=al>0.35;lab,nn=ndimage.label(m,structure=np.ones((3,3)));sz=ndimage.sum(m,lab,range(1,nn+1))
    keep=np.isin(lab,[i+1 for i,s in enumerate(sz) if s>=300]);keep=ndimage.binary_dilation(keep,iterations=2)
    al=np.where(keep,al,0)
    R,G,B=col[...,0],col[...,1],col[...,2];mm=np.minimum(R,B)-G;sp=(mm>35)&(R>110)
    col=np.dstack([np.where(sp,R-mm*0.8,R),G,np.where(sp,B-mm*0.8,B)])
    if os.environ.get('NOGREEN')=='1': mx=np.maximum(col[...,0],col[...,2]); col[...,1]=np.minimum(col[...,1],mx*1.02+4)
    return np.clip(col,0,255),al
# video px -> start_in px (×k) -> orig px ((p-o)/sc)
s=k/sc; M=np.float32([[s,0,-ox/sc],[0,s,-oy/sc]])
SEL=list(range(0,48,2)); frames=[]
for i in SEL:
    col,al=key(fr[i]); pm=np.dstack([col*al[...,None],al*255]).astype(np.float32)
    w=cv2.warpAffine(pm,M,(720,700),flags=cv2.INTER_AREA,borderValue=0)
    w=cv2.resize(w,(180,175),interpolation=cv2.INTER_AREA)
    A=np.clip(w[...,3],0,255);C=np.clip(w[...,:3],0,A[...,None]);rgb=np.where(A[...,None]>0,C/np.maximum(A[...,None]/255,1e-3),0)
    frames.append(np.dstack([np.clip(rgb,0,255),A]).astype(np.uint8))
sheet=Image.new('RGBA',(180*12,175*2),(0,0,0,0))
for j,o in enumerate(frames): sheet.paste(Image.fromarray(o,'RGBA'),((j%12)*180,(j//12)*175))
name=os.path.basename(SRC).replace('_00001_.mp4','')
sheet.save(f'{OUT}/{name}.webp',quality=90,method=6)
# 비교: 앉기 마지막 vs 먹기 0번
d=np.abs(frames[0][...,3].astype(int)-cell[...,3].astype(int)).mean()
json.dump({'src':name,'n':len(SEL),'fps':12,'map':[round(float(s),4),round(float(ox),1),round(float(oy),1)],'alpha_diff_f0_vs_sit':round(float(d),2)},open(f'{OUT}/{name}.json','w'))
print(name,'sc',round(sc,3),'off',round(ox),round(oy),'diff',round(d,2))
