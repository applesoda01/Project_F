"""히요리 비율(측정치: 머리≈전체 키의 44%, 몸통 폭≈23%, 손 지름≈11%, 하체≈20%)로 새로 설계한 3/4 무지 인형 실루엣. 캔버스 1024, 키 약 786px."""
import numpy as np, cv2
N=1024
def cap(m,a,b,w):
    cv2.line(m,a,b,255,int(w)); cv2.circle(m,a,int(w/2),255,-1); cv2.circle(m,b,int(w/2),255,-1)
def ell(m,c,ax,ay,ang=0): cv2.ellipse(m,c,(int(ax),int(ay)),ang,0,360,255,-1)
def sil():
    m=np.zeros((N,N),np.uint8)
    # 뒤쪽 팔·다리 먼저(실루엣은 합집합이라 순서 무관)
    cap(m,(580,545),(612,625),46); ell(m,(622,690),34,36)         # 뒤팔·손
    cap(m,(555,725),(580,830),76); cap(m,(580,830),(595,900),60); ell(m,(612,920),56,25)   # 뒷다리·발
    cap(m,(470,725),(450,835),80); cap(m,(450,835),(440,905),62); ell(m,(422,920),56,25)   # 앞다리·발
    ell(m,(512,615),88,108)                 # 몸통
    ell(m,(512,705),92,58)                  # 골반
    cap(m,(500,478),(506,522),64)           # 목
    ell(m,(496,322),152,166)                # 머리
    cap(m,(440,545),(385,610),50); cap(m,(385,610),(335,660),46); ell(m,(318,672),42,44)   # 앞팔·손(앞으로)
    return m
if __name__=='__main__':
    m=sil(); cv2.imwrite('tmpl_sil.png',255-m)
    ed=cv2.Canny(m,50,150); ed=cv2.dilate(ed,np.ones((3,3),np.uint8)); cv2.imwrite('ctrl_stand.png',255-ed)
    ys,xs=np.where(m>0); H=ys.max()-ys.min()
    cv2.imwrite('tmpl_view.png',np.hstack([cv2.resize(255-m,(512,512)),cv2.resize(255-ed,(512,512))]))
    print('bbox x',xs.min(),xs.max(),'y',ys.min(),ys.max(),'키',H,'머리비율',round(2*166/H,3),'면적비',round(m.mean()/255,3))
