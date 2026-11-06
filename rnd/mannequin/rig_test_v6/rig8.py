"""v6 파츠(히요리와 같은 영역 크기)를 박스 사각형에 그대로 맞춰 걷기/대기를 재생. 파츠 사각형 모서리(BL,TL,TR) → 박스 꼭짓점."""
import json, numpy as np, cv2, sys
import PIL.Image as I
N=1024; S=775/370
P2=['uArmB','fArmB','shinB','thighB','shinF','thighF','body','hip','head','uArmF','fArmF']
SRC={'uArmB':'armB','fArmB':'handB','shinB':'legB','thighB':'thighB','shinF':'legF','thighF':'thighF','body':'body','hip':'hipF','head':'head','uArmF':'armF','fArmF':'handF'}
FILE={'thighB':'thigh','thighF':'thigh'}
PARTS=['armB','handB','legB','thighB','legF','thighF','body','hipF','head','armF','handF']
walk=json.load(open('/home/claude/project_f/rnd/mannequin/walk_v0.json'))['data']
def cvp(q): a=np.array(q,float).reshape(4,2); return np.stack([512+a[:,0]*S,900-a[:,1]*S],1).astype(np.float32)
import importlib.util
sp=importlib.util.spec_from_file_location('r','/tmp/mq6/rig_test.py')
idle=[{p:[float(x) for x in seg.split(',')] for p,seg in zip(['armB','handB','legB','thighB','legF','thighF','body','hipF','head','armF','handF'],l.split('|'))} for l in open('/home/claude/project_f/rnd/mannequin/idle_v0.txt').read().strip().splitlines()] if False else None
IMG={p:cv2.imread(f'/tmp/mq9/parts/{FILE.get(p,p)}.png',cv2.IMREAD_UNCHANGED) for p in P2}
def corners(p):
    h,w=IMG[p].shape[:2]; return np.float32([[0,h],[0,0],[w,0]])  # BL,TL,TR
def affine(p,f):
    Q=cvp(f[SRC[p]]); return cv2.getAffineTransform(corners(p),Q[:3])
def render(f,boxes=True):
    cv=np.full((N,N,3),255,np.float32)
    for p in P2:
        M=affine(p,f); w=cv2.warpAffine(IMG[p],M,(N,N),flags=cv2.INTER_AREA if False else cv2.INTER_LINEAR,borderValue=(0,0,0,0))
        a=w[:,:,3:4]/255.0; cv[:]=cv*(1-a)+w[:,:,:3]*a
    cv=cv.astype(np.uint8)
    if boxes:
        for p in P2: cv2.polylines(cv,[cvp(f[SRC[p]]).astype(np.int32)],True,(0,140,70),1)
    return cv
if __name__=='__main__':
    f=walk[0]
    for p in P2:
        M=affine(p,f); print(p,'회전 %.0f°'%np.degrees(np.arctan2(M[1,0],M[0,0])),'스케일 %.2f %.2f'%(np.hypot(M[0,0],M[1,0]),np.hypot(M[0,1],M[1,1])))
    cv2.imwrite('f0.png',render(f))
