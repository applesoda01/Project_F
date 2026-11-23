import numpy as np, cv2, sys
from PIL import Image, ImageDraw
op=np.array(Image.open('open_sharp.png').convert('RGB'))
cl=np.array(Image.open('cls_5002_143.png').convert('RGB'))
lum=cl.mean(axis=2); reg=np.zeros(lum.shape,np.uint8)
for (a,b,c,e) in ((387,153,412,165),(428,152,459,164)): reg[b:e,a:c]=(lum[b:e,a:c]<170)*255
skin=cv2.inpaint(cl,cv2.dilate(reg,np.ones((3,3),np.uint8)),4,cv2.INPAINT_TELEA).astype(float)
S=4;H,W=op.shape[:2]
def bez(p0,p1,p2,k=24): return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],(1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in [i/k for i in range(k+1)]]
def stroke(d,pts,w0,w1):
  n=len(pts)-1
  for i in range(n):
    w=(w0+(w1-w0)*i/n)*S; a=(pts[i][0]*S,pts[i][1]*S); b=(pts[i+1][0]*S,pts[i+1][1]*S)
    d.line([a,b],fill=255,width=max(1,int(w))); r=w/2; d.ellipse((b[0]-r,b[1]-r,b[0]+r,b[1]+r),fill=255)
def layer(fn):
  L=Image.new('L',(W*S,H*S),0); fn(ImageDraw.Draw(L)); return np.array(L.resize((W,H),Image.LANCZOS)).astype(float)/255
sag=float(sys.argv[1]); crease=float(sys.argv[2]); out=sys.argv[3]; LASH=int(sys.argv[4]) if len(sys.argv)>4 else 1
def lines(d):
  # 왼쪽 눈: 안쪽 → 바깥 (바깥이 굵고 끝이 살짝 올라감)
  stroke(d,bez((409.5,152.5),(398,152.5+sag),(386,150.5)),0.8,3.0)
  stroke(d,bez((386,150.5),(384.6,149.8),(383.4,148.4)),2.8,0.8)
  if LASH:
   for (x,y) in ((388.5,151.6),(391,152.6)): stroke(d,[(x,y),(x-1.6,y+2.4)],1.1,0.5)
  # 오른쪽 눈
  stroke(d,bez((428.5,151),(442,151+sag),(457.5,149)),0.8,3.0)
  stroke(d,bez((457.5,149),(459.2,148.3),(460.6,146.8)),2.8,0.8)
  if LASH:
   for (x,y) in ((455,149.9),(452.4,150.6)): stroke(d,[(x,y),(x+1.6,y+2.4)],1.1,0.5)
def creases(d):
  stroke(d,bez((407,147.5),(397,145.6),(388,146.8)),0.7,1.3)
  stroke(d,bez((431,146.6),(443,144.4),(455,145.2)),0.7,1.3)
m=layer(lines); c=layer(creases)*crease
col=np.array([40,26,22.]); ccol=np.array([150,105,85.])
o=skin*(1-c[...,None])+ccol*c[...,None]; o=o*(1-m[...,None])+col*m[...,None]
Image.fromarray(o.clip(0,255).astype(np.uint8)).save(out)
