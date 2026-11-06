"""v1: 가려지는 부분을 파츠별 완성형으로 채운 분해본. 완성 영역 = 원래 파츠 ∪ (파츠 기본 도형 ∩ 마네킹 실루엣). 단색+윤곽선으로 다시 그려 단색 규칙 유지."""
import json, numpy as np, cv2, sys
sys.path.insert(0,'.')
from rig_test import *
from scipy import ndimage as ndi
from score import fig_mask
import PIL.Image as I
img=cv2.imread('m15_flat.png'); M=fig_mask(img); parts=split(img,M); P=prim()
C=np.array([218,236,254],np.uint8); OC=np.array([59,59,72],np.uint8)
def complete(p):
    m=parts[p]|((P[p]>0)&M)
    m=ndi.binary_closing(m,np.ones((5,5),bool))
    return m
def draw_part(m):
    im=np.full((N,N,3),255,np.uint8); im[m]=C
    edge=m&~ndi.binary_erosion(m,np.ones((9,9),bool))     # 윤곽 두께 약 4px
    im[edge]=OC; return im
pi={}; areas={}
for p in PARTS:
    m=complete(p); pi[p]=(draw_part(m),m); areas[p]=(int(parts[p].sum()),int(m.sum()))
print('파츠별 면적(원래→완성형):',{p:f"{a}→{b}" for p,(a,b) in areas.items()})
walk=json.load(open('/home/claude/project_f/rnd/mannequin/walk_v0.json'))['data']
idle=[{p:[float(x) for x in seg.split(',')] for p,seg in zip(PARTS,l.split('|'))} for l in open('/home/claude/project_f/rnd/mannequin/idle_v0.txt').read().strip().splitlines()]
S=775/370
def run_fk(frames,ref,S,parts_img):
    info=setup(ref); st0={p:state(ref[p],info[p]) for p in PARTS}; res=[]
    order=['body','hipF','head','armF','armB','thighF','thighB','handF','handB','legF','legB']
    for f in frames:
        Mx={}
        for p in order:
            piv,ang=state(f[p],info[p]); piv0,ang0=st0[p]; dang=ang-ang0; src=np.array(PIV[p],float)
            R=cv2.getRotationMatrix2D((float(src[0]),float(src[1])),float(dang),1.0)
            if p in PARENT:
                A=Mx[PARENT[p]]; dst=A[:,:2]@src+A[:,2]       # 부모 변환을 거친 관절 위치
                cur=R[:,:2]@src+R[:,2]; R[:,2]+=dst-cur
            else:
                dx,dy=(piv-piv0)*S; R[0,2]+=dx; R[1,2]+=-dy
            Mx[p]=R
        canvas=np.full((N,N,3),255,np.uint8); cov=np.zeros((N,N),bool)
        for p in PARTS:
            img,msk=parts_img[p]; w=cv2.warpAffine(img,Mx[p],(N,N),flags=cv2.INTER_LINEAR,borderValue=(255,255,255)); wm=cv2.warpAffine(msk.astype(np.uint8)*255,Mx[p],(N,N),flags=cv2.INTER_NEAREST)>127
            canvas[wm]=w[wm]; cov|=wm
        res.append((canvas,cov))
    return res
def evaluate(frames,tag):
    out=run_fk(frames,idle[0],S,pi); nc=[];small=[];gaps=[]
    for c,cov in out:
        cov2=ndi.binary_dilation(cov,np.ones((5,5),bool)); lab,n=ndi.label(cov2); nc.append(n)
        sz=np.sort(ndi.sum(cov2,lab,range(1,n+1)))[::-1]; small.append(float(sz[1:].sum()/sz.sum()) if n>1 else 0.0)
        fill=ndi.binary_fill_holes(ndi.binary_closing(cov,np.ones((21,21),bool))); gaps.append(float((fill&~cov).sum()/cov.sum()))
    print(tag,'이어진 프레임 %d/%d, 분리 면적 평균 %.3f 최대 %.3f, 빈틈 평균 %.3f 최대 %.3f'%(sum(n==1 for n in nc),len(nc),np.mean(small),max(small),np.mean(gaps),max(gaps)))
    ims=[c for c,_ in out]
    pil=[I.fromarray(cv2.cvtColor(cv2.resize(c,(512,512)),cv2.COLOR_BGR2RGB)) for c in ims]
    pil[0].save(f'rig3_{tag}.gif',save_all=True,append_images=pil[1:],duration=33,loop=0)
    cols=6; rows=(len(ims)+cols-1)//cols
    sel=ims+[np.full_like(ims[0],255)]*(rows*cols-len(ims))
    cv2.imwrite(f'rig3_{tag}_sheet.jpg',np.vstack([np.hstack([cv2.resize(sel[r*cols+c],(300,300)) for c in range(cols)]) for r in range(rows)]),[cv2.IMWRITE_JPEG_QUALITY,88])
evaluate(walk,'walk'); evaluate(idle,'idle')
rest=run_fk([idle[0]],idle[0],S,pi)[0][0]; cv2.imwrite('rig3_rest.png',rest)
