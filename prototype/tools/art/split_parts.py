import sys; from PIL import Image; import numpy as np
from scipy import ndimage as nd
src,out=sys.argv[1],sys.argv[2]
im=np.array(Image.open(src).convert('RGB')).astype(float)
L=im.mean(2)
m=L>40; m[1380:]=False; m[:,:1000]=False
f=nd.binary_fill_holes(nd.binary_closing(m,iterations=3))
lab,n=nd.label(f)
names={}
objs=[(s,i+1) for i,s in enumerate(nd.find_objects(lab)) if (lab[s]==i+1).sum()>2000]
objs.sort(key=lambda t:t[0][1].start)
for nm,(s,k) in zip(['shield','sword','notice','quill'],objs):
    pad=6
    y0,y1=max(s[0].start-pad,0),s[0].stop+pad; x0,x1=max(s[1].start-pad,0),s[1].stop+pad
    reg=(lab[y0:y1,x0:x1]==k)
    core=nd.binary_erosion(reg,iterations=2)
    zone=nd.binary_dilation(reg,iterations=3)
    Lr=L[y0:y1,x0:x1]; rgb=im[y0:y1,x0:x1]
    edge=np.clip(Lr*2.5,0,255)
    a=np.where(core,255,np.where(zone,edge,0))
    al=np.maximum(a,1)/255
    col=np.where(core[...,None],rgb,np.clip(rgb/al[...,None],0,255))
    o=np.dstack([col,a]).astype(np.uint8)
    Image.fromarray(o,'RGBA').save(f'{out}/{nm}.png'); print(nm,o.shape)
