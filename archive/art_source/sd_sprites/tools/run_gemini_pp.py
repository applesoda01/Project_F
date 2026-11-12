import sys,os,subprocess,json,numpy as np
from PIL import Image
from scipy import ndimage as nd
src,tag,out=sys.argv[1],sys.argv[2],sys.argv[3]
PMIN=int(os.environ.get('PMIN',16));PMAX=int(os.environ.get('PMAX',60));PERCENTER=os.environ.get('PERCENTER')=='1';XFADE=int(os.environ.get('XFADE',0))
os.makedirs(out,exist_ok=True)
raw=subprocess.run(['ffmpeg','-v','error','-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
pr=subprocess.run(['ffprobe','-v','error','-select_streams','v','-show_entries','stream=width,height','-of','csv=p=0',src],capture_output=True,text=True).stdout.strip().split(',');W,H=int(pr[0]),int(pr[1]); F=np.frombuffer(raw,np.uint8).reshape(-1,H,W,3)
n=len(F)
border=np.concatenate([F[:,:8].reshape(-1,3),F[:,:,:8].reshape(-1,3)])
bg=np.median(border,0); print(tag,'frames',n,'bg',bg)
def key(fr):
    a=fr.astype(np.float32); d=np.abs(a-bg).sum(-1)
    al=np.clip((d-45)/(120-45),0,1); al[al>0.98]=1
    al[int(H*0.89):,int(W*0.844):]=0    # watermark corner
    m=al>0.5; lab,k=nd.label(m)
    if k:
        s=nd.sum(m,lab,range(1,k+1)); keep=np.isin(lab,1+np.where(s>=200)[0])
        al*=nd.binary_dilation(keep,iterations=2)
    solid=al>=0.98
    if solid.any():
        _,ind=nd.distance_transform_edt(~solid,return_indices=True)
        edge=(al>0)&~solid; a[edge]=a[ind[0][edge],ind[1][edge]]
    # despill
    near=nd.binary_dilation(~solid,iterations=4)&(al>0)
    sp=np.clip(np.minimum(a[...,0]-a[...,1],a[...,2]-a[...,1]),0,None)*0.95
    a[...,0]-=sp*near; a[...,2]-=sp*near
    return np.dstack([a.clip(0,255),al*255]).astype(np.uint8)
# small grayscale for period search
sm=np.array([np.array(Image.fromarray(f).resize((160,int(160*H/W)))).astype(np.float32) for f in F])
def dif(i,j): return np.abs(sm[i]-sm[j]).mean()
best=None
for P in range(PMIN,PMAX+1):
    e=np.mean([dif(i,i+P) for i in range(24,n-P,3)])
    if best is None or e<best[0]: best=(e,P)
P=best[1]
cand=[(dif(s,s+P),s) for s in range(24,n-P)]
e0,s=min(cand)
print(tag,'period',P,'start',s,'loop err',round(e0,2),'period err',round(best[0],2))
K=[key(F[i]) for i in range(s,s+P)]
k0=key(F[0])
ys,xs=np.where(k0[...,3]>128); h0=ys.max()-ys.min()+1
sc=516.0/h0
bots=[];cxs=[]
for k in K:
    ys,xs=np.where(k[...,3]>128); bots.append(ys.max()); cxs.append(np.median(xs))
bot=max(bots); cx=float(np.mean(cxs))
cxf=[cx]*len(K)
if PERCENTER:
    tc=[]
    for k in K:
        al=k[...,3]>128; ys,xs=np.where(al); top=ys.min(); lim=top+int((ys.max()-top)*0.55)
        m=al.copy(); m[lim:]=False; yy,xx=np.where(m); tc.append(xx.mean())
    tc=np.array(tc); n_=len(tc); sm_=np.array([np.mean([tc[(i+d)%n_] for d in (-2,-1,0,1,2)]) for i in range(n_)])
    # remove only linear drift + high freq: keep mean
    cxf=list(tc-(tc-sm_)*0+0)  # follow torso
    cxf=list(sm_)
print(tag,'h0',h0,'scale',round(sc,3),'bottom',bot,'cx',round(cx,1))
frames=[]
for i,k in enumerate(K):
    p=k.astype(np.float32); p[...,:3]*=p[...,3:]/255
    im=Image.fromarray(p.astype(np.uint8),'RGBA').resize((round(W*sc),round(H*sc)),Image.LANCZOS)
    q=np.array(im).astype(np.float32); al=q[...,3:]; q[...,:3]=np.where(al>0,q[...,:3]*255/np.maximum(al,1),0)
    im=Image.fromarray(q.clip(0,255).astype(np.uint8),'RGBA')
    can=Image.new('RGBA',(640,800),(0,0,0,0))
    can.alpha_composite(im,(round(320-cxf[i]*sc),round(787-bot*sc)))
    frames.append(can)
if XFADE:
    import copy
    n_=len(frames)
    for j in range(XFADE):
        w=(j+1)/(XFADE+1)
        a=np.array(frames[n_-XFADE+j]).astype(np.float32); b=np.array(frames[j]).astype(np.float32)
        frames[n_-XFADE+j]=Image.fromarray((a*(1-w)+b*w).astype(np.uint8),'RGBA')
for i,f in enumerate(frames): f.save(f'{out}/run_{i:02d}.png')
# gif + sheet
bgc=Image.new('RGBA',(640,800),(70,90,80,255))
g=[Image.alpha_composite(bgc,f).convert('P',palette=Image.ADAPTIVE) for f in frames]
g[0].save(f'{out}/run.gif',save_all=True,append_images=g[1:],duration=42,loop=0)
cols=12; rows=(P+cols-1)//cols
sh=Image.new('RGBA',(cols*160,rows*200),(70,90,80,255))
for i,f in enumerate(frames): sh.alpha_composite(f.resize((160,200)),((i%cols)*160,(i//cols)*200))
sh.save(f'{out}/sheet.png')
json.dump({'name':'run','source':os.path.basename(src),'frames':P,'source_start_frame':int(s),'fps':24,'canvas':[640,800],'feet_y':787,'center_x':320,'standing_height_px':516,'scale_video_to_game':round(sc,4),'loop_error':round(float(e0),2)},open(f'{out}/run.json','w'),indent=1)
