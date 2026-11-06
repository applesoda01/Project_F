"""v5: 절대 자세 적용 + 박스 겹쳐 보기. 파츠 크기는 마네킹 유지(길이만 박스에 맞춤), 관절점·방향은 박스를 프레임마다 그대로 따름.
팔다리: 근위 관절점(PIV2)→파츠 끝점 축을 박스의 '부모 쪽 변 중점→반대 변 중점' 축에 맞춤(길이만 조절, 폭 1배).
머리·몸통·엉덩이: 박스 중심에 균일 배율로 맞추고 박스 회전량을 따름."""
import json, numpy as np, cv2, sys
sys.argv=[sys.argv[0]]
sys.path.insert(0,'.')
import rig_test6 as R6, rig_test4 as R4, rig_test as R
from rig_test4 import P2, SRC, PIV2, idle, walk
from scipy import ndimage as ndi
import PIL.Image as I
N=1024; S=775/370; pi=R4.pi
def cvp(q): a=np.array(q,float).reshape(4,2); return np.stack([512+a[:,0]*S, 900-a[:,1]*S],1)
LIMB=['uArmF','fArmF','uArmB','fArmB','thighF','shinF','thighB','shinB']; ROOT=['head','body','hip']
info=R.setup(idle[0])
def axis_of(p):
    ys,xs=np.where(pi[p][1]); P=np.array(PIV2[p],float); d=np.hypot(xs-P[0],ys-P[1]); i=int(np.argmax(d)); D=np.array([xs[i],ys[i]],float)
    return P,D
AX={p:axis_of(p) for p in LIMB}
def box_axis(f,p):
    c=cvp(f[SRC[p]]); e=info[SRC[p]]; P=(c[e]+c[(e+1)%4])/2; D=(c[(e+2)%4]+c[(e+3)%4])/2; return P,D
def rot(a): return np.array([[np.cos(a),-np.sin(a)],[np.sin(a),np.cos(a)]])
def ang(v): return np.arctan2(v[1],v[0])
def part_M(p,f):
    if p in LIMB:
        Pp,Dp=AX[p]; Pt,Dt=box_axis(f,p); vp=Dp-Pp; vt=Dt-Pt
        sa=np.clip(np.linalg.norm(vt)/max(np.linalg.norm(vp),1),0.6,2.5); Rm=rot(ang(vt)-ang(vp))@np.diag([1,1])
        # 축 방향 길이만 sa배: 파츠 축 좌표계에서 스케일
        ap=ang(vp); Rp=rot(ap); Sc=Rp@np.diag([sa,1.0])@Rp.T
        L=rot(ang(vt)-ap)@Sc; t=Pt-L@Pp; return np.hstack([L,t[:,None]])
    # 루트: 박스 중심, 균일 배율, 회전은 기준 박스 대비 증가분
    c0=cvp(idle[0][SRC[p]]); cf=cvp(f[SRC[p]]); w0=np.linalg.norm(c0[1]-c0[0]); h0=np.linalg.norm(c0[2]-c0[1])
    m=pi[p][1].astype(np.uint8); rect=cv2.minAreaRect(cv2.findNonZero(m)); (cx,cy),(rw,rh),ra=rect
    s=min(max(w0,h0)/max(rw,rh),min(w0,h0)/min(rw,rh)) if p!='hip' else 1.0
    th=ang(cf[1]-cf[0])-ang(c0[1]-c0[0]); L=rot(th)*s; cen=np.array([cx,cy]); t=cf.mean(0)-L@cen
    return np.hstack([L,t[:,None]])
COL={'uArmB':(60,60,220),'fArmB':(40,120,240),'shinB':(200,80,60),'thighB':(220,140,60),'shinF':(60,170,60),'thighF':(30,200,120),'body':(160,60,160),'hip':(200,60,120),'head':(40,40,40),'uArmF':(0,150,220),'fArmF':(0,100,160)}
def render(f):
    canvas=np.full((N,N,3),255,np.uint8); cov=np.zeros((N,N),bool); parts_w={}
    for p in P2:
        M=part_M(p,f); im,mk=pi[p]; w=cv2.warpAffine(im,M,(N,N),flags=cv2.INTER_LINEAR,borderValue=(255,255,255)); wm=cv2.warpAffine(mk.astype(np.uint8)*255,M,(N,N),flags=cv2.INTER_NEAREST)>127
        canvas[wm]=w[wm]; cov|=wm; parts_w[p]=wm
    ov=canvas.copy(); boxm={}
    for p in P2:
        q=cvp(f[SRC[p]]); cv2.polylines(ov,[q.astype(np.int32)],True,COL[p],2)
        bm=np.zeros((N,N),np.uint8); cv2.fillPoly(bm,[q.astype(np.int32)],1); boxm[p]=bm>0
    return canvas,ov,cov,parts_w,boxm
def evaluate(frames,tag):
    out=[render(f) for f in frames]; nc=[];gaps=[];inside=[];foot=[]
    for (c,ov,cov,pw,bm),f in zip(out,frames):
        cov2=ndi.binary_dilation(cov,np.ones((5,5),bool)); lab,n=ndi.label(cov2); nc.append(n)
        fill=ndi.binary_fill_holes(ndi.binary_closing(cov,np.ones((21,21),bool))); gaps.append(float((fill&~cov).sum()/cov.sum()))
        inside.append(float(np.mean([(pw[p]&bm[p]).sum()/max(pw[p].sum(),1) for p in P2])))
        ub=np.zeros((N,N),bool)
        for p in P2: ub|=bm[p]
        foot.append(float(np.where(cov)[0].max()-np.where(ub)[0].max()))
    print(tag,'이어진 %d/%d, 빈틈 평균 %.3f, 파츠가 자기 박스 안에 든 비율 평균 %.2f, 발끝 높이 차(마네킹-박스, px) 평균 %.1f 범위 %.0f~%.0f'%(sum(n==1 for n in nc),len(nc),np.mean(gaps),np.mean(inside),np.mean(foot),min(foot),max(foot)))
    ims=[o[1] for o in out]; ms=[o[0] for o in out]
    pil=[I.fromarray(cv2.cvtColor(cv2.resize(c,(512,512)),cv2.COLOR_BGR2RGB)) for c in ims]
    pil[0].save(f'rig7_{tag}_overlay.gif',save_all=True,append_images=pil[1:],duration=60,loop=0)
    cols=6; rows=(len(ims)+cols-1)//cols; sel=ims+[np.full_like(ims[0],255)]*(rows*cols-len(ims))
    cv2.imwrite(f'rig7_{tag}_overlay_sheet.jpg',np.vstack([np.hstack([cv2.resize(sel[r*cols+c],(300,300)) for c in range(cols)]) for r in range(rows)]),[cv2.IMWRITE_JPEG_QUALITY,88])
    return ims
if __name__=='__main__':
    evaluate(walk,'walk'); evaluate(idle,'idle')
