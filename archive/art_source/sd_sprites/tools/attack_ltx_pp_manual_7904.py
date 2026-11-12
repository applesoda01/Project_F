import cv2,numpy as np,json
from PIL import Image
from scipy import ndimage
SRC='/mnt/user-data/uploads/output/pf/atkE_h1_warrior_m_s7904_00001_.mp4'
OUT='/mnt/user-data/outputs/atk/final_horiz_7904/'
SEL=[0,2,4,6,8,9,10,11,13,14,19,24,26,28,30,32]
c=cv2.VideoCapture(SRC);fr=[]
while True:
    ok,f=c.read()
    if not ok:break
    fr.append(cv2.cvtColor(f,cv2.COLOR_BGR2RGB))
mag=np.array([255,0,255],np.float32)
def key(rgb):
    f=rgb.astype(np.float32);d=np.abs(f-mag).sum(2)
    al=np.clip((d-130)/(280-130),0,1);solid=al>=0.98
    idx=ndimage.distance_transform_edt(~solid,return_distances=False,return_indices=True)
    col=np.where(solid[...,None],f,f[idx[0],idx[1]])
    m=al>0.35;lab,n=ndimage.label(m);sz=ndimage.sum(m,lab,range(1,n+1))
    keep=np.isin(lab,[i+1 for i,s in enumerate(sz) if s>=200]);keep=ndimage.binary_dilation(keep,iterations=2)
    al=np.where(keep,al,0)
    # despill: 가장자리 4px 안쪽 띠에서 마젠타 성분(R,B가 G보다 높은 양)을 제거
    din=ndimage.distance_transform_edt(al>0.5);band=(din<=4)&(al>0)
    R,G,B=col[...,0],col[...,1],col[...,2]
    pink=np.clip(np.minimum(R-G,B-G),0,None)
    k=np.where(band,0.95,0.0)
    col=np.dstack([R-pink*k,G,B-pink*k])
    return np.clip(col,0,255),al
col0,al0=key(fr[0]);ys,xs=np.nonzero(al0>0.5)
y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max();s=516/(y1-y0+1);cx=(x0+x1)/2
print('frame0 bbox',x0,x1,y0,y1,'scale',round(s,4),'cx',cx)
M=np.float32([[s,0,512-cx*s],[0,s,787.5-(y1+1)*s]])
W,H=1024,880;frames=[]
for k,i in enumerate(SEL):
    col,al=key(fr[i]);pm=np.dstack([col*al[...,None],al*255]).astype(np.float32)
    w=cv2.warpAffine(pm,M,(W,H),flags=cv2.INTER_LANCZOS4,borderValue=0)
    A=np.clip(w[...,3],0,255);C=np.clip(w[...,:3],0,A[...,None])
    rgb=np.where(A[...,None]>0,C/np.maximum(A[...,None]/255,1e-3),0)
    o=np.dstack([np.clip(rgb,0,255),A]).astype(np.uint8);frames.append(o)
    Image.fromarray(o,'RGBA').save(OUT+f'atk_{k:02d}.png')
bb=[]
for o in frames:
    a=o[...,3]>100;yy,xx=np.nonzero(a);bb.append((xx.min(),xx.max(),yy.min(),yy.max()))
bb=np.array(bb);print('x range',bb[:,0].min(),bb[:,1].max(),'y range',bb[:,2].min(),bb[:,3].max(),'edge touch',int((bb[:,0]<=1).sum()+(bb[:,1]>=W-2).sum()))
bgc=np.array([225,225,225],np.uint8)
def comp(o):
    a=o[...,3:4]/255.;return (o[...,:3]*a+bgc*(1-a)).astype(np.uint8)[200:880,0:1024]
G=[Image.fromarray(comp(o)).resize((640,425)) for o in frames]
G[0].save(OUT+'preview_24fps.gif',save_all=True,append_images=G[1:],duration=42,loop=0,disposal=2)
G[0].save(OUT+'preview_12fps.gif',save_all=True,append_images=G[1:],duration=83,loop=0,disposal=2)
# sheet
th=[cv2.resize(comp(o),(341,205)) for o in frames]+[np.full((205,341,3),225,np.uint8)]*2
rows=[np.hstack(th[r*6:(r+1)*6]) for r in range(3)];cv2.imwrite(OUT+'sheet.png',cv2.cvtColor(np.vstack(rows),cv2.COLOR_RGB2BGR))
json.dump({'name':'warrior_m_attack_horizontal','source':'atkE_h1_warrior_m_s7904 (LTX, CFG1.5, 2s 24fps)','frames':len(SEL),'source_frame_indices':SEL,
 'canvas':[W,H],'origin_feet_xy':[512,787],'scale_video_to_game':round(float(s),4),'standing_height_px':516,
 'note':'frame0 = start pose; origin x=512 is start-pose bbox center incl. sword; sprites are placed by one fixed transform (no per-frame recentering), so body movement is preserved',
 'timing_hint':'24fps: 16 frames ~0.67s; 12fps: ~1.4s','impact_frames':[8,9,10]},open(OUT+'attack_horizontal.json','w'),ensure_ascii=False,indent=1)
