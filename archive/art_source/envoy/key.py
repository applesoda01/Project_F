import sys
from PIL import Image, ImageFilter
import numpy as np
def key(path):
    im=np.array(Image.open(path).convert('RGB')).astype(float)
    r,g,b=im[...,0],im[...,1],im[...,2]
    d=g-np.maximum(r,b)            # green dominance
    a=np.clip(1-(d-8)/22,0,1)      # d<=8 opaque, d>=30 transparent
    A=Image.fromarray((a*255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    m=np.maximum(r,b); g2=np.where(g>m,m+(g-m)*0.15,g)   # despill
    out=np.dstack([r,g2,b,np.array(A)]).astype('uint8')
    return Image.fromarray(out,'RGBA')
def bust(img,y0=10,y1=830,cx=445):
    h=y1-y0; w=round(499*h/640); x0=cx-w//2
    return img.crop((x0,y0,x0+w,y1)).resize((499,640),Image.LANCZOS),(x0,y0,w,h)
if __name__=='__main__':
    k=key(sys.argv[1]); k.save('envoy_full_alpha.png'); b,box=bust(k); b.save('envoy_stand.png'); print(box)
