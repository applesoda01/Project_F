import sys,cv2,numpy as np,json,os
from PIL import Image
from scipy import ndimage
SRC,OUT,NAME=sys.argv[1],sys.argv[2],sys.argv[3]; NF=16; OX=int(os.environ.get('OX',512)); NOGREEN=os.environ.get('NOGREEN')=='1'
os.makedirs(OUT,exist_ok=True)
c=cv2.VideoCapture(SRC);fr=[]
while True:
    ok,f=c.read()
    if not ok:break
    fr.append(cv2.cvtColor(f,cv2.COLOR_BGR2RGB))
H0,W0=fr[0].shape[:2]
border=np.concatenate([fr[0][:6].reshape(-1,3),fr[0][:,:6].reshape(-1,3)]).astype(np.float32); bg=np.median(border,0)
def key(rgb):
    f=rgb.astype(np.float32);d=np.abs(f-bg).sum(2)
    al=np.clip((d-60)/(200-60),0,1);solid=al>=0.98
    idx=ndimage.distance_transform_edt(~solid,return_distances=False,return_indices=True)
    col=np.where(solid[...,None],f,f[idx[0],idx[1]])
    m=al>0.35;lab,n=ndimage.label(m);sz=ndimage.sum(m,lab,range(1,n+1))
    keep=np.isin(lab,[i+1 for i,s in enumerate(sz) if s>=200]);keep=ndimage.binary_dilation(keep,iterations=2)
    al=np.where(keep,al,0)
    din=ndimage.distance_transform_edt(al>0.5);band=(din<=4)&(al>0)
    R,G,B=col[...,0],col[...,1],col[...,2];pink=np.clip(np.minimum(R-G,B-G),0,None);k=np.where(band,0.95,0.0)
    return np.clip(np.dstack([R-pink*k,G,B-pink*k]),0,255),al
# motion energy vs frame0
sm=[cv2.resize(f,(96,96)).astype(np.float32) for f in fr]
e=np.array([np.abs(s-sm[0]).mean() for s in sm]); thr=max(3.0,e.max()*0.15)
act=np.where(e>thr)[0]; a,b=int(act.min()),int(act.max())
# return-to-rest: after b small; sample NF-2 frames across [a-1, b+1], plus rest at both ends
inner=np.unique(np.round(np.linspace(max(0,a-1),min(len(fr)-1,b+1),NF-2)).astype(int)).tolist()
SEL=[0]+inner+[len(fr)-1]
while len(SEL)<NF: SEL.insert(-1,SEL[-2])
col0,al0=key(fr[0]);ys,xs=np.nonzero(al0>0.5)
y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max();s=516/(y1-y0+1);cx=(x0+x1)/2
M=np.float32([[s,0,OX-cx*s],[0,s,787.5-(y1+1)*s]]);W,H=1024,880;frames=[]
for k,i in enumerate(SEL):
    col,al=key(fr[i])
    if NOGREEN:
        mx=np.maximum(col[...,0],col[...,2]); col[...,1]=np.minimum(col[...,1],mx*1.02+4)
    pm=np.dstack([col*al[...,None],al*255]).astype(np.float32)
    w=cv2.warpAffine(pm,M,(W,H),flags=cv2.INTER_LANCZOS4,borderValue=0)
    A=np.clip(w[...,3],0,255);C=np.clip(w[...,:3],0,A[...,None])
    rgb=np.where(A[...,None]>0,C/np.maximum(A[...,None]/255,1e-3),0)
    o=np.dstack([np.clip(rgb,0,255),A]).astype(np.uint8);frames.append(o)
    Image.fromarray(o,'RGBA').save(OUT+f'/atk_{k:02d}.png')
bb=[]
for o in frames:
    m_=o[...,3]>100;yy,xx=np.nonzero(m_);bb.append((xx.min(),xx.max(),yy.min(),yy.max()))
bb=np.array(bb);edge=int((bb[:,0]<=1).sum()+(bb[:,1]>=W-2).sum()+(bb[:,2]<=1).sum())
bgc=np.array([225,225,225],np.uint8)
def comp(o):
    al=o[...,3:4]/255.;return (o[...,:3]*al+bgc*(1-al)).astype(np.uint8)[200:880,0:1024]
G=[Image.fromarray(comp(o)).resize((640,425)) for o in frames]
G[0].save(OUT+'/preview_24fps.gif',save_all=True,append_images=G[1:],duration=42,loop=0,disposal=2)
th=[cv2.resize(comp(o),(341,205)) for o in frames]; th+= [np.full((205,341,3),225,np.uint8)]*((-len(th))%6)
rows=[np.hstack(th[r*6:(r+1)*6]) for r in range(len(th)//6)];cv2.imwrite(OUT+'/sheet.png',cv2.cvtColor(np.vstack(rows),cv2.COLOR_RGB2BGR))
peak=int(np.argmax([e[i] for i in SEL]))
json.dump({'name':NAME,'source':os.path.basename(SRC),'frames':len(SEL),'source_frame_indices':SEL,'active_source_frames':[a,b],'canvas':[W,H],'origin_feet_xy':[OX,787],'scale_video_to_game':round(float(s),4),'standing_height_px':516,'peak_frame':peak,'edge_touch':edge,'timing_hint':'24fps: %d frames ~%.2fs'%(len(SEL),len(SEL)/24)},open(OUT+f'/{NAME}.json','w'),ensure_ascii=False,indent=1)
print(NAME,'frames',len(fr),'active',a,b,'SEL',SEL,'edge',edge,'scale',round(s,3))
