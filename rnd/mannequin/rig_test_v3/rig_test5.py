"""v3: 마네킹 파츠를 레퍼런스 박스(측정 사각형)에 맞춰 위치·비율을 정렬한 뒤, 프레임마다 박스 변환(아핀)을 그대로 적용.
정렬: 파츠 완성형 마스크의 최소 회전 사각형 → 기준 프레임(idle[0]) 박스에 맞춤(회전이 가장 작은 모서리 대응). 프레임: 기준 박스→해당 프레임 박스의 아핀."""
import json, numpy as np, cv2, sys
sys.path.insert(0,'.')
import rig_test4 as R4
from rig_test4 import P2, SRC, pi, idle, walk
from scipy import ndimage as ndi
import PIL.Image as I
N=1024; S=775/370
def cv(q): a=np.array(q,float).reshape(4,2); return np.stack([512+a[:,0]*S, 900-a[:,1]*S],1).astype(np.float32)
Q0={p:cv(idle[0][SRC[p]]) for p in P2}
def fit(p):
    m=pi[p][1].astype(np.uint8); cnt=cv2.findNonZero(m); rect=cv2.minAreaRect(cnt); pts=cv2.boxPoints(rect).astype(np.float32)
    # pts 순서의 4가지 순환 대응 중 회전이 가장 작은 것
    best=None
    for s in range(4):
        src=np.roll(pts,s,0); A=cv2.getAffineTransform(src[:3],Q0[p][:3]); ang=abs(np.degrees(np.arctan2(A[1,0],A[0,0])))
        if best is None or ang<best[0]: best=(ang,A,src)
    return best[1]
A0={p:fit(p) for p in P2}
def full(A): return np.vstack([A,[0,0,1]])
def render(f):
    canvas=np.full((N,N,3),255,np.uint8); cov=np.zeros((N,N),bool)
    for p in P2:
        Qf=cv(f[SRC[p]]); B=cv2.getAffineTransform(Q0[p][:3],Qf[:3]); M=(full(B)@full(A0[p]))[:2]
        im,mk=pi[p]; w=cv2.warpAffine(im,M,(N,N),flags=cv2.INTER_LINEAR,borderValue=(255,255,255)); wm=cv2.warpAffine(mk.astype(np.uint8)*255,M,(N,N),flags=cv2.INTER_NEAREST)>127
        canvas[wm]=w[wm]; cov|=wm
    return canvas,cov
def evaluate(frames,tag):
    out=[render(f) for f in frames]; nc=[];small=[];gaps=[]
    for c,cov in out:
        cov2=ndi.binary_dilation(cov,np.ones((5,5),bool)); lab,n=ndi.label(cov2); nc.append(n)
        sz=np.sort(ndi.sum(cov2,lab,range(1,n+1)))[::-1]; small.append(float(sz[1:].sum()/sz.sum()) if n>1 else 0.0)
        fill=ndi.binary_fill_holes(ndi.binary_closing(cov,np.ones((21,21),bool))); gaps.append(float((fill&~cov).sum()/cov.sum()))
    print(tag,'이어진 프레임 %d/%d, 분리 면적 평균 %.3f 최대 %.3f, 빈틈 평균 %.3f 최대 %.3f'%(sum(n==1 for n in nc),len(nc),np.mean(small),max(small),np.mean(gaps),max(gaps)))
    ims=[c for c,_ in out]
    pil=[I.fromarray(cv2.cvtColor(cv2.resize(c,(512,512)),cv2.COLOR_BGR2RGB)) for c in ims]
    pil[0].save(f'rig5_{tag}.gif',save_all=True,append_images=pil[1:],duration=33,loop=0)
    cols=6; rows=(len(ims)+cols-1)//cols; sel=ims+[np.full_like(ims[0],255)]*(rows*cols-len(ims))
    cv2.imwrite(f'rig5_{tag}_sheet.jpg',np.vstack([np.hstack([cv2.resize(sel[r*cols+c],(300,300)) for c in range(cols)]) for r in range(rows)]),[cv2.IMWRITE_JPEG_QUALITY,88])
    return ims
if __name__=='__main__':
    ims=evaluate(walk,'walk'); evaluate(idle,'idle')
    cv2.imwrite('rig5_rest.png',render(idle[0])[0])
