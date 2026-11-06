"""히요리 idle 자세(정지 화면 눈금 측정, 4배 확대 좌표 → 캔버스 환산)에 맞춘 3/4 무지 인형 실루엣 v3. 이미지는 보관하지 않고 좌표값만 사용."""
import numpy as np, cv2
N=1024; K=1.077
def T(x,y): return (int(round(512+(x-370)*K)), int(round(156+(y-70)*K)))
def cap(m,a,b,w):
    a,b=T(*a),T(*b); w=int(w*K); cv2.line(m,a,b,255,w); cv2.circle(m,a,w//2,255,-1); cv2.circle(m,b,w//2,255,-1)
def ell(m,c,ax,ay,ang=0): cv2.ellipse(m,T(*c),(int(ax*K),int(ay*K)),ang,0,360,255,-1)
def sil():
    m=np.zeros((N,N),np.uint8)
    # 다리(왼쪽 = 뒤로 빠진 다리, 오른쪽 = 앞다리)
    cap(m,(305,660),(268,712),84); cap(m,(268,712),(232,765),62); ell(m,(212,782),46,22,-10)
    cap(m,(430,665),(470,712),84); cap(m,(470,712),(474,765),62); ell(m,(488,782),46,22,10)
    ell(m,(362,640),118,58)                 # 골반
    ell(m,(366,515),88,100)                 # 몸통
    cap(m,(360,395),(358,430),64)           # 목
    ell(m,(372,232),150,162,-4)             # 머리(약간 기울임)
    cap(m,(305,440),(262,505),48); cap(m,(262,505),(305,535),44); ell(m,(318,545),36,34)   # 왼팔(가슴 앞 소품 잡기)
    cap(m,(432,430),(500,455),48); cap(m,(500,455),(555,472),44); ell(m,(575,478),46,40)   # 오른팔(앞으로 뻗음)
    return m
if __name__=='__main__':
    m=sil(); cv2.imwrite('tmpl_sil.png',255-m)
    ed=cv2.Canny(m,50,150); ed=cv2.dilate(ed,np.ones((3,3),np.uint8)); cv2.imwrite('ctrl_stand.png',255-ed)
    cv2.imwrite('tmpl_view.png',np.hstack([cv2.resize(255-m,(512,512)),cv2.resize(255-ed,(512,512))]))
    ys,xs=np.where(m>0); H=ys.max()-ys.min(); print('bbox x',xs.min(),xs.max(),'y',ys.min(),ys.max(),'키',H,'머리비율',round(2*162*K/H,3),'면적비',round(m.mean()/255,3))
