"""마네킹 새 파츠(v6): 도형(타원·둥근 관)으로 직접 그린 단색 인형 파츠 11개 + 얼굴 빈 슬롯.
크기는 레퍼런스 파츠 영역(아틀라스 px)과 같고, 이미지 크기 = 영역 × K. 모든 파츠 같은 색·같은 윤곽선 굵기."""
import numpy as np, cv2, json
K=4.19; SS=4                      # 환산 배율, 슈퍼샘플링
FILL=(254,236,218,255); LINE=(72,59,59,255)   # RGBA(윤곽은 BGRA 아님 주의: 아래서 BGR로 변환)
OW=1.1                            # 윤곽선 굵기(아틀라스 px)
# 파츠: (w,h) 아틀라스 px, 도형 목록: ('cap',(x1,y1),(x2,y2),폭) / ('ell',(cx,cy),rx,ry)
SPEC={
 'head':((72,62),[('ell',(44,30.5),24.5,29)]),
 'body':((56,71),[('cap',(28,6),(28,22),12),('ell',(28,46),19,24)]),
 'hip':((60,25),[('ell',(30,12.5),27,10.5)]),
 'uArmF':((25,37),[('cap',(19,5),(7,31),10)]),
 'uArmB':((25,34),[('cap',(5,6),(19,28),10)]),
 'fArmF':((46,53),[('cap',(36,6),(19.4,36.3),12),('ell',(19.4,36.3),14,14)]),   # 앞손: 주먹→손목 축이 위에서 오른쪽으로 32도
 'fArmB':((39,50),[('cap',(14.4,6),(21.5,34.2),12),('ell',(21.5,34.2),13,13)]),   # 뒷손: 주먹→손목 축이 위에서 왼쪽으로 15도
 'thigh':((51,52),[('cap',(25.5,5),(25.5,45),22)]),
 'shin':((23,50),[('cap',(11.5,4),(11.5,38),13),('ell',(12,43),10.5,5.5)]),
 'face':((53,41),[]),
}
def draw(shapes,w,h,color,extra=0.0):
    W,H=int(round(w*K))*SS,int(round(h*K))*SS; m=np.zeros((H,W),np.uint8); s=K*SS
    for sh in shapes:
        if sh[0]=='cap':
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
