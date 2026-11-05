"""자체 설계 무지 인형 실루엣(옆모습, 기본 자세). 관절 높이는 참고 뼈대 측정값(바닥=0, 단위=뼈대 좌표)을 따르고 두께는 자체 설계."""
import numpy as np, cv2
S, CX, FY, N = 2.0, 512, 930, 1024
def P(x,y): return (int(round(CX+x*S)), int(round(FY-y*S)))
def cap(m,a,b,w,val=255): cv2.line(m,P(*a),P(*b),val,int(w*S)); cv2.circle(m,P(*a),int(w*S/2),val,-1); cv2.circle(m,P(*b),int(w*S/2),val,-1)
def ell(m,c,ax,ay,val=255): cv2.ellipse(m,P(*c),(int(ax*S),int(ay*S)),0,0,360,val,-1)
def sil():
    m=np.zeros((N,N),np.uint8)
    ell(m,(4,306),60,58)                    # 머리
    cap(m,(10,150),(8,212),76)              # 몸통
    ell(m,(9,150),40,22)                    # 골반
    for (h,k,a,fx,hx) in [((-12,135),(-24,75),(-30,18),-44,-30),((32,135),(40,75),(44,18),34,44)]:
        cap(m,h,k,38); cap(m,k,a,30); ell(m,(fx,10),24,11)   # 허벅지·다리·발
    cap(m,(-21,222),(-30,162),24); ell(m,(-31,150),14,14)   # 앞팔·손
    cap(m,(27,226),(31,166),24); ell(m,(32,154),14,14)      # 뒷팔·손
    return m
if __name__=='__main__':
    m=sil(); cv2.imwrite('tmpl_sil.png',255-m)
    ed=cv2.Canny(m,50,150); ed=cv2.dilate(ed,np.ones((3,3),np.uint8)); cv2.imwrite('ctrl_stand.png',255-ed)
    cv2.imwrite('tmpl_view.png',np.hstack([cv2.resize(255-m,(512,512)),cv2.resize(255-ed,(512,512))]))
    ys,xs=np.where(m>0); print('bbox',xs.min(),xs.max(),ys.min(),ys.max(),'면적비',m.mean()/255)
