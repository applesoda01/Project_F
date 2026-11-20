import numpy as np, cv2, sys
from PIL import Image, ImageDraw, ImageFilter
base=np.array(Image.open('cls_5002_143.png').convert('RGB'))
# 1) U 선 지우기: 눈 영역(149~167행)의 어두운 픽셀을 주변 피부로 메움
reg=np.zeros(base.shape[:2],np.uint8)
y0,y1,x0,x1=148,168,374,468
lum=base[...,:].mean(axis=2)
for (a,b,c,e) in ((387,153,412,165),(428,152,459,164)):
  reg[b:e,a:c]=(lum[b:e,a:c]<170).astype(np.uint8)*255
reg=cv2.dilate(reg,np.ones((3,3),np.uint8))
clean=cv2.inpaint(base,reg,4,cv2.INPAINT_TELEA)
# 2) 감은 눈 선 직접 그리기 (4배로 그려 줄임 = 부드러운 선)
S=4; W,H=clean.shape[1],clean.shape[0]
lay=Image.new('L',(W*S,H*S),0); d=ImageDraw.Draw(lay)
def stroke(pts,w0,w1):
  pts=[(x*S,y*S) for x,y in pts]
  n=len(pts)-1
  for i in range(n):
    t=i/max(1,n-1); w=(w0+(w1-w0)*t)*S
    d.line([pts[i],pts[i+1]],fill=255,width=int(round(w)),joint='curve')
    r=w/2; d.ellipse((pts[i+1][0]-r,pts[i+1][1]-r,pts[i+1][0]+r,pts[i+1][1]+r),fill=255)
def curve(p0,p1,p2,k=16):
  return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],(1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in [i/k for i in range(k+1)]]
A=float(sys.argv[1]) if len(sys.argv)>1 else 1.5   # 위로 볼록한 정도(px)
# 왼쪽 눈: 안쪽(409) → 바깥(385), 바깥쪽이 굵음
stroke(curve((409,155),(398,153.6-A),(387,152.6)),1.4,3.1)
stroke(curve((387,152.6),(385.4,152.9),(384.2,154.0)),2.8,1.3)
# 오른쪽 눈: 안쪽(428) → 바깥(458)
stroke(curve((430,154),(444,152.2-A),(458,151.2)),1.4,3.1)
stroke(curve((458,151.2),(459.7,151.6),(460.9,152.8)),2.8,1.3)
m=np.array(lay.resize((W,H),Image.LANCZOS)).astype(float)/255
col=np.array([38,24,20],float)
out=(clean*(1-m[...,None])+col*m[...,None]).astype(np.uint8)
Image.fromarray(out).save(sys.argv[2] if len(sys.argv)>2 else 'closed_drawn.png')
