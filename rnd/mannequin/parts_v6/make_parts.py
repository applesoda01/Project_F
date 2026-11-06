"""마네킹 새 파츠(v6): 도형(타원·둥근 관)으로 직접 그린 단색 인형 파츠 11개 + 얼굴 빈 슬롯.
크기는 레퍼런스 파츠 영역(아틀라스 px)과 같고, 이미지 크기 = 영역 × K. 모든 파츠 같은 색·같은 윤곽선 굵기."""
import numpy as np, cv2, json
K=4.19; SS=4                      # 환산 배율, 슈퍼샘플링
FILL=(254,236,218,255); LINE=(72,59,59,255)   # RGBA(윤곽은 BGRA 아님 주의: 아래서 BGR로 변환)
OW=1.1                            # 윤곽선 굵기(아틀라스 px)
# 파츠: (w,h) 아틀라스 px, 도형 목록: ('cap',(x1,y1),(x2,y2),폭) / ('ell',(cx,cy),rx,ry)
SPEC={
 'head':((72,62),[('ell',(44,30.5),24.5,29)]),
 'body':((56,71),[('cap',(27,10),(27,22),11),
   ('poly',[(6, 17.2), (15, 16.5), (27, 16.2), (36, 17.2), (36.9, 20), (37.7, 23), (40.0, 26), (41.9, 29), (42.9, 32), (43.1, 35), (43.1, 38), (43.6, 41), (44.0, 44), (44.6, 47), (45.7, 50), (47.0, 53), (48.3, 56), (50.0, 59), (51.3, 62), (50.4, 65), (48.0, 68), (44, 69.5), (31, 70.3), (19, 70), (7, 68), (3.3, 65), (3.1, 62), (4.0, 59), (5.1, 56), (6.3, 53), (7.1, 50), (8.0, 47), (8.6, 44), (8.9, 41), (8.9, 38), (8.6, 35), (8.1, 32), (7.9, 29), (7.4, 26), (6.3, 23), (5.4, 20), (5.6, 18)],3)]),
 'hip':((60,25),[('ell',(30,12.5),27,10.5)]),
 'uArmF':((25,37),[('cap',(19,5),(7,31),10)]),
 'uArmB':((25,34),[('cap',(5,6),(19,28),10)]),
 'fArmF':((46,53),[('cap',(36,6),(19.4,36.3),12),('ell',(19.4,36.3),14,14)]),   # 앞손: 주먹→손목 축이 위에서 오른쪽으로 32도
 'fArmB':((39,50),[('cap',(14.4,6),(21.5,34.2),12),('ell',(21.5,34.2),13,13)]),   # 뒷손: 주먹→손목 축이 위에서 왼쪽으로 15도
 'thigh':((51,52),[('cap',(25.5,5),(25.5,45),22)]),
 'shinF':((23,50),[('cap',(12.4,4),(8.7,34),13),('ell',(8.2,41),8,5)]),     # 맨살 위→아래 중심선 기울기 7도
 'shinB':((22,45),[('cap',(12.1,4),(8.0,34),12),('ell',(7.6,40),7,5)]),     # 맨살 흰 털 위쪽 구간의 위→아래 중심선 기울기 7.8도
 'face':((53,41),[]),
}
def draw(shapes,w,h,color,extra=0.0):
    W,H=int(round(w*K))*SS,int(round(h*K))*SS; m=np.zeros((H,W),np.uint8); s=K*SS
    for sh in shapes:
        if sh[0]=='poly':
            pts=np.array([[p[0]*s,p[1]*s] for p in sh[1]],np.int32); pm=np.zeros_like(m); cv2.fillPoly(pm,[pts],255)
            k=int(sh[2]*s)|1; pm=cv2.GaussianBlur(pm,(k,k),0); pm=(pm>127).astype(np.uint8)*255
            if extra: pm=cv2.dilate(pm,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(extra*s)|1,int(extra*s)|1)))
            m=np.maximum(m,pm)
        elif sh[0]=='cap':
            a=(int(sh[1][0]*s),int(sh[1][1]*s)); b=(int(sh[2][0]*s),int(sh[2][1]*s)); t=int((sh[3]+extra)*s)
            cv2.line(m,a,b,255,t); cv2.circle(m,a,t//2,255,-1); cv2.circle(m,b,t//2,255,-1)
        else:
            cv2.ellipse(m,(int(sh[1][0]*s),int(sh[1][1]*s)),(int((sh[2]+extra/2)*s),int((sh[3]+extra/2)*s)),0,0,360,255,-1)
    return m
def build(name):
    (w,h),shapes=SPEC[name]; out_w,out_h=int(round(w*K)),int(round(h*K))
    if not shapes: return np.zeros((out_h,out_w,4),np.uint8)
    outer=draw(shapes,w,h,0,extra=2*OW*0.5*2/2)   # 바깥 윤곽
    inner=draw(shapes,w,h,0,extra=0)
    # outer 는 윤곽 포함 크기: 도형 + 윤곽 폭
    outer=draw(shapes,w,h,0,extra=OW); 
    o=cv2.resize(outer,(out_w,out_h),interpolation=cv2.INTER_AREA); i=cv2.resize(inner,(out_w,out_h),interpolation=cv2.INTER_AREA)
    img=np.zeros((out_h,out_w,4),np.float32); a_o=o/255.0; a_i=i/255.0
    line=np.array([LINE[2],LINE[1],LINE[0]],np.float32)   # RGB->BGR
    fill=np.array([FILL[2],FILL[1],FILL[0]],np.float32)
    rgb=line[None,None,:]*(a_o-a_i)[...,None]+fill[None,None,:]*a_i[...,None]
    alpha=a_o
    with np.errstate(divide='ignore',invalid='ignore'): col=np.where(alpha[...,None]>0,rgb/np.maximum(alpha[...,None],1e-6),0)
    return np.dstack([np.clip(col,0,255),np.clip(alpha*255,0,255)]).astype(np.uint8)
if __name__=='__main__':
    import os; os.makedirs('parts',exist_ok=True)
    for n in SPEC: cv2.imwrite(f'parts/{n}.png',build(n)); print(n,build(n).shape[1],'x',build(n).shape[0])
