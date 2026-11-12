import sys,numpy as np
from PIL import Image
from scipy import ndimage as ndi
src,tag=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGB');a=np.asarray(im).astype(float)
bg=np.median(a[:40,:40].reshape(-1,3),0)
d=np.sqrt(((a-bg)**2).sum(2));al=np.clip((d-70)/70,0,1)
m=ndi.binary_opening(al>0.5,iterations=2)
lab,n=ndi.label(ndi.binary_dilation(m,iterations=2))
sz=ndi.sum(m,lab,range(1,n+1));objs=ndi.find_objects(lab)
keep=sorted([i for i in range(n) if sz[i]>100000],key=lambda i:objs[i][1].start)
for k,i in enumerate(keep):
    sl=objs[i];A=al*(lab==i+1)
    o=Image.fromarray(np.dstack([a,A*255]).astype(np.uint8)[sl]);o.save(f'/tmp/hs/{tag}_{k}.png');print(k,o.size,int(sz[i]))
