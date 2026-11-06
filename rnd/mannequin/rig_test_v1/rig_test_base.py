"""마네킹(15번 단색화본)을 11개 파츠로 잘라 걷기 모션(측정 수치)에 얹는 시험.
파츠 분할: tmpl6 기본 도형(파츠별 마스크)에서 가장 가까운 파츠로 마네킹 픽셀을 배정. 이동: 기준 자세(idle 1프레임) 대비 사각형 이동·회전 변화량을 파츠 피벗에 적용."""
import json, math, numpy as np, cv2, sys
sys.path.insert(0,'/home/claude/project_f/rnd/mannequin/gen_v1')
from scipy import ndimage as ndi
N=1024; K=1.077
def T(x,y): return (int(round(512+(x-370)*K)), int(round(156+(y-70)*K)))
def cap(m,a,b,w):
    a,b=T(*a),T(*b); w=int(w*K); cv2.line(m,a,b,255,w); cv2.circle(m,a,w//2,255,-1); cv2.circle(m,b,w//2,255,-1)
def ell(m,c,ax,ay,ang=0): cv2.ellipse(m,T(*c),(int(ax*K),int(ay*K)),ang,0,360,255,-1)
PARTS=['armB','handB','legB','thighB','legF','thighF','body','hipF','head','armF','handF']
def prim():
    P={p:np.zeros((N,N),np.uint8) for p in PARTS}
    # 뒤쪽 다리 = 이미지 왼쪽 다리, 앞쪽 다리 = 이미지 오른쪽 다리. 앞팔 = 가슴 앞 팔, 뒷팔 = 앞으로 뻗은 팔
    cap(P['thighB'],(305,660),(268,712),84); cap(P['legB'],(268,712),(232,765),62); ell(P['legB'],(212,782),46,22,-10)
    cap(P['thighF'],(430,665),(470,712),84); cap(P['legF'],(470,712),(474,765),62); ell(P['legF'],(488,782),46,22,10)
    ell(P['hipF'],(362,640),118,58); ell(P['body'],(370,515),98,100); cap(P['body'],(360,395),(358,430),64)
    ell(P['head'],(386,236),142,152,-4)
    cap(P['armF'],(305,440),(262,505),48); cap(P['armF'],(262,505),(305,535),44); ell(P['handF'],(318,545),36,34)
    cap(P['armB'],(425,438),(448,494),56); cap(P['armB'],(448,494),(525,482),52); ell(P['handB'],(566,482),44,42)
    return P
# 마네킹 위 피벗(관절) 좌표(캔버스 px). 머리·몸통·골반은 도형 중심
PIV={'head':T(386,236),'body':T(370,515),'hipF':T(362,640),'thighF':T(430,665),'legF':T(470,712),'thighB':T(305,660),'legB':T(268,712),
     'armF':T(305,440),'handF':T(305,535),'armB':T(425,438),'handB':T(525,482)}
PARENT={'thighF':'hipF','legF':'thighF','thighB':'hipF','legB':'thighB','armF':'body','handF':'armF','armB':'body','handB':'armB'}
def split(img,M):
    P=prim(); dist={}
    for p in PARTS:
        dist[p]=ndi.distance_transform_edt(P[p]==0)
    pri={'head':0,'handF':1,'handB':1,'armF':2,'armB':2,'legF':3,'legB':3,'thighF':4,'thighB':4,'hipF':5,'body':6}
    D=np.stack([dist[p]+0.01*pri[p] for p in PARTS],0); lab=np.argmin(D,0)
    # 도형 내부 픽셀은 우선순위 높은 파츠 우선
    inside=np.stack([P[p]>0 for p in PARTS],0)
    for i in sorted(range(len(PARTS)),key=lambda i:-pri[PARTS[i]]):
        lab=np.where(inside[i],i,lab)
    return {p:(M&(lab==i)) for i,p in enumerate(PARTS)}
def qinfo(q):
    c=np.array(q,float).reshape(4,2); return c
def setup(ref):
    info={}
    cen={p:qinfo(ref[p]).mean(0) for p in PARTS}
    for p in PARTS:
        c=qinfo(ref[p])
        if p in PARENT:
            pc=cen[PARENT[p]]; mids=[(c[i]+c[(i+1)%4])/2 for i in range(4)]; e=int(np.argmin([np.linalg.norm(m-pc) for m in mids]))
        else: e=None
        info[p]=e
    return info
def state(q,e):
    c=qinfo(q); ctr=c.mean(0)
    if e is None: piv=ctr; vec=(c[1]+c[2])/2-(c[0]+c[3])/2
    else: piv=(c[e]+c[(e+1)%4])/2; vec=ctr-piv
    return piv, math.degrees(math.atan2(vec[1],vec[0]))
def run(frames,ref,S,parts_img,out_prefix):
    info=setup(ref); st0={p:state(ref[p],info[p]) for p in PARTS}
    res=[]
    for f in frames:
        canvas=np.full((N,N,3),255,np.uint8); cov=np.zeros((N,N),bool)
        for p in PARTS:
            piv,ang=state(f[p],info[p]); piv0,ang0=st0[p]
            dx,dy=(piv-piv0)*S; dang=ang-ang0
            src=PIV[p]; Mx=cv2.getRotationMatrix2D((float(src[0]),float(src[1])),float(dang),1.0)
            Mx[0,2]+=dx; Mx[1,2]+=-dy
            img,msk=parts_img[p]
            w=cv2.warpAffine(img,Mx,(N,N),flags=cv2.INTER_LINEAR,borderValue=(255,255,255))
            wm=cv2.warpAffine(msk.astype(np.uint8)*255,Mx,(N,N),flags=cv2.INTER_NEAREST)>127
            canvas[wm]=w[wm]; cov|=wm
        res.append((canvas,cov))
    return res
if __name__=='__main__':
    img=cv2.imread('m15_flat.png'); from score import fig_mask
    M=fig_mask(img); parts=split(img,M); 
    pi={p:(img,parts[p]) for p in PARTS}
    walk=json.load(open('/home/claude/project_f/rnd/mannequin/walk_v0.json'))['data']
    idle=[{p:[float(x) for x in seg.split(',')] for p,seg in zip(PARTS,l.split('|'))} for l in open('/home/claude/project_f/rnd/mannequin/idle_v0.txt').read().strip().splitlines()]
    S=775/370
    ref=idle[0]
    out=run(walk,ref,S,pi,'walk')
    # 지표: 정지 자세 대비 파츠 합집합 면적, 구멍(빈틈) = 닫힘 연산한 형체 안에서 비어 있는 픽셀
    areas=[];gaps=[]
    for cv,cov in out:
        fill=ndi.binary_closing(cov,np.ones((21,21),bool)); fill=ndi.binary_fill_holes(fill)
        gaps.append(float((fill&~cov).sum()/max(1,cov.sum()))); areas.append(int(cov.sum()))
    print('원본 면적',int(M.sum()),'프레임별 면적 최소/최대',min(areas),max(areas))
    print('빈틈 비율(닫힘 기준) 평균 %.3f 최대 %.3f'%(np.mean(gaps),max(gaps)))
    ims=[c for c,_ in out]
    import PIL.Image as I
    pil=[I.fromarray(cv2.cvtColor(cv2.resize(c,(512,512)),cv2.COLOR_BGR2RGB)) for c in ims]
    pil[0].save('rig_walk_test.gif',save_all=True,append_images=pil[1:],duration=33,loop=0)
    cols=6;sh=np.vstack([np.hstack([cv2.resize(ims[r*cols+c],(300,300)) for c in range(cols)]) for r in range(4)])
    cv2.imwrite('rig_walk_sheet.jpg',sh,[cv2.IMWRITE_JPEG_QUALITY,88])
    # 분할 확인 이미지
    cols_=[(230,60,60),(60,160,230),(60,200,100),(200,200,50),(180,60,200),(60,200,200),(150,150,150),(240,140,40),(100,100,230),(40,120,60),(200,100,150)]
    seg=np.full((N,N,3),255,np.uint8)
    for p,cc in zip(PARTS,cols_): seg[parts[p]]=cc
    cv2.imwrite('rig_parts.png',seg)
