import sys; sys.path.insert(0,'/tmp/mq10'); sys.path.insert(0,'/tmp/mq9')
import numpy as np, cv2, PIL.Image as I
import rig8 as R
from refparts import get
HY={'uArmB':'armB','fArmB':'handB','shinB':'legB','thighB':'thighB','shinF':'legF','thighF':'thighF','body':'body','hip':'hipF','head':'head','uArmF':'armF','fArmF':'handF'}
ours=dict(R.IMG)
hy={}
for p in R.P2:
    c=get(HY[p]); h,w=ours[p].shape[:2]; hy[p]=cv2.resize(c,(w,h),interpolation=cv2.INTER_LANCZOS4)
def frame(f,imgs):
    R.IMG=imgs; return R.render(f,boxes=False)
fr=[]
for f in R.walk:
    a=frame(f,hy); b=frame(f,ours)
    sep=np.full((1024,6,3),200,np.uint8)
    fr.append(np.hstack([a,sep,b]))
pil=[I.fromarray(cv2.cvtColor(cv2.resize(x,(1024,512)),cv2.COLOR_BGR2RGB)) for x in fr]
pil[0].save('walk_v6.gif',save_all=True,append_images=pil[1:],duration=60,loop=0)
cols=4; sel=[fr[i] for i in (0,3,6,9,12,15,18,21)]
sheet=np.vstack([np.hstack([cv2.resize(sel[r*cols+c],(500,250)) for c in range(cols)]) for r in range(2)])
cv2.imwrite('walk_v6_sheet.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,90])
cv2.imwrite('f0_cmp.png',fr[0])
