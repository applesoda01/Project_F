"""v2: 확정 구성 12파츠(머리·몸통·엉덩이·위팔2·아래팔+손 2·허벅지2·종아리2, 얼굴은 빈 슬롯)로 m15_flat을 분할하고 FK로 걷기·대기 재측정.
동작 수치는 이전 측면 기준 데이터(walk_v0/idle_v0)를 그대로 사용: 위팔=원래 armX 사각형, 아래팔+손=원래 handX 사각형. (구조 시험용, 정면 레퍼런스 수치 추출 전)"""
import json, numpy as np, cv2, sys
sys.path.insert(0,'.')
import rig_test as R
from rig_test import T,cap,ell,N,state,qinfo
from scipy import ndimage as ndi
from score import fig_mask
import PIL.Image as I
P2=['uArmB','fArmB','shinB','thighB','shinF','thighF','body','hip','head','uArmF','fArmF']
SRC={'uArmB':'armB','fArmB':'handB','shinB':'legB','thighB':'thighB','shinF':'legF','thighF':'thighF','body':'body','hip':'hipF','head':'head','uArmF':'armF','fArmF':'handF'}  # 동작 수치 출처(11→11, 얼굴 슬롯 제외)
def prim2():
    P={p:np.zeros((N,N),np.uint8) for p in P2}
    cap(P['thighB'],(305,660),(268,712),84); cap(P['shinB'],(268,712),(232,765),62); ell(P['shinB'],(212,782),46,22,-10)
    cap(P['thighF'],(430,665),(470,712),84); cap(P['shinF'],(470,712),(474,765),62); ell(P['shinF'],(488,782),46,22,10)
    ell(P['hip'],(362,640),118,58); ell(P['body'],(370,515),98,100); cap(P['body'],(360,395),(358,430),64)
    ell(P['head'],(386,236),142,152,-4)
    cap(P['uArmF'],(305,440),(262,505),48); cap(P['fArmF'],(262,505),(305,535),44); ell(P['fArmF'],(318,545),36,34)
    cap(P['uArmB'],(425,438),(448,494),56); cap(P['fArmB'],(448,494),(525,482),52); ell(P['fArmB'],(566,482),44,42)
    return P
PIV2={'head':T(386,236),'body':T(370,515),'hip':T(362,640),'thighF':T(430,665),'shinF':T(470,712),'thighB':T(305,660),'shinB':T(268,712),
      'uArmF':T(305,440),'fArmF':T(262,505),'uArmB':T(425,438),'fArmB':T(448,494)}
PAR2={'thighF':'hip','shinF':'thighF','thighB':'hip','shinB':'thighB','uArmF':'body','fArmF':'uArmF','uArmB':'body','fArmB':'uArmB'}
def split2(M):
    P=prim2(); pri={'head':0,'fArmF':1,'fArmB':1,'uArmF':2,'uArmB':2,'shinF':3,'shinB':3,'thighF':4,'thighB':4,'hip':5,'body':6}
    dist={p:ndi.distance_transform_edt(P[p]==0) for p in P2}
    D=np.stack([dist[p]+0.01*pri[p] for p in P2],0); lab=np.argmin(D,0)
    inside=np.stack([P[p]>0 for p in P2],0)
    for i in sorted(range(len(P2)),key=lambda i:-pri[P2[i]]): lab=np.where(inside[i],i,lab)
    return {p:(M&(lab==i)) for i,p in enumerate(P2)}
img=cv2.imread('m15_flat.png'); M=fig_mask(img); parts=split2(M); PR=prim2()
C=np.array([218,236,254],np.uint8); OC=np.array([59,59,72],np.uint8)
def complete(p): return ndi.binary_closing(parts[p]|((PR[p]>0)&M),np.ones((5,5),bool))
def draw_part(m):
    im=np.full((N,N,3),255,np.uint8); im[m]=C; edge=m&~ndi.binary_erosion(m,np.ones((9,9),bool)); im[edge]=OC; return im
pi={p:(draw_part(complete(p)),complete(p)) for p in P2}
walk=json.load(open('/home/claude/project_f/rnd/mannequin/walk_v0.json'))['data']
idle=[{p:[float(x) for x in seg.split(',')] for p,seg in zip(R.PARTS,l.split('|'))} for l in open('/home/claude/project_f/rnd/mannequin/idle_v0.txt').read().strip().splitlines()]
S=775/370
def run_fk(frames,ref):
    info=R.setup(ref); st0={p:state(ref[SRC[p]],info[SRC[p]]) for p in P2}; res=[]
    order=['body','hip','head','uArmF','uArmB','thighF','thighB','fArmF','fArmB','shinF','shinB']
    for f in frames:
        Mx={}
        for p in order:
            s=SRC[p]; piv,ang=state(f[s],info[s]); piv0,ang0=st0[p]; dang=ang-ang0; src=np.array(PIV2[p],float)
            Rm=cv2.getRotationMatrix2D((float(src[0]),float(src[1])),float(dang),1.0)
            if p in PAR2:
                A=Mx[PAR2[p]]; dst=A[:,:2]@src+A[:,2]; cur=Rm[:,:2]@src+Rm[:,2]; Rm[:,2]+=dst-cur
            else:
                dx,dy=(piv-piv0)*S; Rm[0,2]+=dx; Rm[1,2]+=-dy
            Mx[p]=Rm
        canvas=np.full((N,N,3),255,np.uint8); cov=np.zeros((N,N),bool)
        for p in P2:
            im,mk=pi[p]; w=cv2.warpAffine(im,Mx[p],(N,N),flags=cv2.INTER_LINEAR,borderValue=(255,255,255)); wm=cv2.warpAffine(mk.astype(np.uint8)*255,Mx[p],(N,N),flags=cv2.INTER_NEAREST)>127
            canvas[wm]=w[wm]; cov|=wm
        res.append((canvas,cov))
    return res
def evaluate(frames,tag):
    out=run_fk(frames,idle[0]); nc=[];small=[];gaps=[]
    for c,cov in out:
        cov2=ndi.binary_dilation(cov,np.ones((5,5),bool)); lab,n=ndi.label(cov2); nc.append(n)
        sz=np.sort(ndi.sum(cov2,lab,range(1,n+1)))[::-1]; small.append(float(sz[1:].sum()/sz.sum()) if n>1 else 0.0)
        fill=ndi.binary_fill_holes(ndi.binary_closing(cov,np.ones((21,21),bool))); gaps.append(float((fill&~cov).sum()/cov.sum()))
    print(tag,'이어진 프레임 %d/%d, 분리 면적 평균 %.3f 최대 %.3f, 빈틈 평균 %.3f 최대 %.3f'%(sum(n==1 for n in nc),len(nc),np.mean(small),max(small),np.mean(gaps),max(gaps)))
    ims=[c for c,_ in out]
    pil=[I.fromarray(cv2.cvtColor(cv2.resize(c,(512,512)),cv2.COLOR_BGR2RGB)) for c in ims]
    pil[0].save(f'rig4_{tag}.gif',save_all=True,append_images=pil[1:],duration=33,loop=0)
    cols=6; rows=(len(ims)+cols-1)//cols; sel=ims+[np.full_like(ims[0],255)]*(rows*cols-len(ims))
    cv2.imwrite(f'rig4_{tag}_sheet.jpg',np.vstack([np.hstack([cv2.resize(sel[r*cols+c],(300,300)) for c in range(cols)]) for r in range(rows)]),[cv2.IMWRITE_JPEG_QUALITY,88])
if __name__=='__main__':
    print('파츠 면적(원본→완성형):',{p:f"{int(parts[p].sum())}→{int(complete(p).sum())}" for p in P2})
    evaluate(walk,'walk'); evaluate(idle,'idle')
    cv2.imwrite('rig4_rest.png',run_fk([idle[0]],idle[0])[0][0])
