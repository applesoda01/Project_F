import sys; sys.path.insert(0,'/tmp/mq10'); sys.path.insert(0,'/tmp/mq9')
import numpy as np, cv2, PIL.Image as I
import rig8 as R
PAD=70
P={p:cv2.imread(f'/tmp/mq11/part_{p}.png',cv2.IMREAD_UNCHANGED) for p in R.P2}
def render(f):
    cv=np.full((1024,1024,3),255,np.float32)
    for p in R.P2:
        M=R.affine(p,f)@np.array([[1,0,-PAD],[0,1,-PAD],[0,0,1]]); w=cv2.warpAffine(P[p],M[:2],(1024,1024),flags=cv2.INTER_LINEAR,borderValue=(0,0,0,0)); a=w[:,:,3:4]/255.0; cv[:]=cv*(1-a)+w[:,:,:3]*a
    return cv.astype(np.uint8)
if __name__=='__main__':
    exec(open('/tmp/mq10/run8.py').read().split("fr=[]")[0])
    fr=[]
    for f in R.walk:
        R.IMG=hy; a=R.render(f,boxes=False)
        fr.append(np.hstack([a[100:960,200:840],np.full((860,6,3),200,np.uint8),render(f)[100:960,200:840]]))
    pil=[I.fromarray(cv2.cvtColor(x,cv2.COLOR_BGR2RGB)) for x in fr]; pil[0].save('lina_walk.gif',save_all=True,append_images=pil[1:],duration=60,loop=0)
    sel=[fr[i] for i in (0,4,8,12,16,20)]; cv2.imwrite('lina_walk_sheet.jpg',np.vstack([np.hstack([cv2.resize(sel[r*3+c],(430,578)) for c in range(3)]) for r in range(2)]),[cv2.IMWRITE_JPEG_QUALITY,90])
    cv2.imwrite('lina_f4.png',fr[4])
