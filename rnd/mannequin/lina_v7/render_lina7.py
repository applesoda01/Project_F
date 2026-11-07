import sys; sys.path.insert(0,'/tmp/mq10'); sys.path.insert(0,'/tmp/mq9')
import numpy as np, cv2, PIL.Image as I
import rig8 as R
PAD=70
P={p:cv2.imread(f'part_{p}.png',cv2.IMREAD_UNCHANGED) for p in R.P2}
def render(f):
    cv=np.full((1024,1024,3),255,np.float32)
    for p in R.P2:
        M=R.affine(p,f)@np.array([[1,0,-PAD],[0,1,-PAD],[0,0,1]]); w=cv2.warpAffine(P[p],M[:2],(1024,1024),flags=cv2.INTER_LINEAR,borderValue=(0,0,0,0)); a=w[:,:,3:4]/255.0; cv[:]=cv*(1-a)+w[:,:,:3]*a
    return cv.astype(np.uint8)
fr=[render(f)[100:960,200:840] for f in R.walk]
pil=[I.fromarray(cv2.cvtColor(x,cv2.COLOR_BGR2RGB)) for x in fr]
pil[0].save('lina7_walk.gif',save_all=True,append_images=pil[1:],duration=60,loop=0)
idx=list(range(0,24,2))[:12]
sel=[fr[i] for i in idx]
sheet=np.vstack([np.hstack([cv2.resize(sel[r*6+c],(320,430)) for c in range(6)]) for r in range(2)])
cv2.imwrite('lina7_walk_sheet.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,90]);print(len(fr))
