"""v5 템플릿: 히요리 걷기 '다리가 모이는 순간'(8등분 중 1/8 지점)의 관절·비율을 눈금으로 읽어 설계한 정면 서 있는 무지 인형.
셀 좌표(세로 545px = 머리 위~발바닥)를 캔버스 1024로 환산. 이미지는 보관하지 않고 좌표값만 사용."""
import numpy as np, cv2
N=1024; K=790/545.0
def T(x,y): return (int(round(512+(x-225)*K)), int(round(150+(y-45)*K)))
def cap(m,a,b,w):
    a,b=T(*a),T(*b); w=int(w*K); cv2.line(m,a,b,255,w); cv2.circle(m,a,w//2,255,-1); cv2.circle(m,b,w//2,255,-1)
def ell(m,c,ax,ay,ang=0): cv2.ellipse(m,T(*c),(int(ax*K),int(ay*K)),ang,0,360,255,-1)
PARTS=['armB','handB','legB','thighB','legF','thighF','body','hipF','head','armF','handF']
def prim():
    P={p:np.zeros((N,N),np.uint8) for p in PARTS}
    cap(P['thighB'],(195,470),(190,525),62); cap(P['legB'],(190,525),(188,572),48); ell(P['legB'],(180,585),38,17,-8)
    cap(P['thighF'],(255,470),(262,528),62); cap(P['legF'],(262,528),(262,572),48); ell(P['legF'],(272,585),38,17,8)
    ell(P['hipF'],(225,445),85,45); ell(P['body'],(225,360),62,70); cap(P['body'],(222,260),(222,292),36)
    ell(P['head'],(222,155),108,108)
    cap(P['armB'],(170,305),(150,360),34); cap(P['armB'],(150,360),(150,400),30); ell(P['handB'],(150,418),34,32)
    cap(P['armF'],(280,305),(298,360),34); cap(P['armF'],(298,360),(300,400),30); ell(P['handF'],(302,418),34,32)
    return P
PIV={'head':T(222,155),'body':T(225,360),'hipF':T(225,445),'thighF':T(255,470),'legF':T(262,528),'thighB':T(195,470),'legB':T(190,525),
     'armF':T(280,305),'handF':T(300,400),'armB':T(170,305),'handB':T(150,400)}
PARENT={'thighF':'hipF','legF':'thighF','thighB':'hipF','legB':'thighB','armF':'body','handF':'armF','armB':'body','handB':'armB'}
def sil():
    m=np.zeros((N,N),np.uint8)
    for p,a in prim().items(): m|=a
    return m
if __name__=='__main__':
    m=sil(); cv2.imwrite('tmpl_sil.png',255-m)
    ed=cv2.Canny(m,50,150); ed=cv2.dilate(ed,np.ones((3,3),np.uint8)); cv2.imwrite('ctrl_stand.png',255-ed)
    cv2.imwrite('tmpl_view.png',np.hstack([cv2.resize(255-m,(512,512)),cv2.resize(255-ed,(512,512))]))
    ys,xs=np.where(m>0); H=ys.max()-ys.min(); print('bbox x',xs.min(),xs.max(),'y',ys.min(),ys.max(),'키',H,'머리비율',round(2*108*K/H,3),'면적비',round(m.mean()/255,3))
