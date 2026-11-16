import sys,os,json,numpy as np
from PIL import Image
from scipy import ndimage
O=sys.argv[1]
for d in sorted(os.listdir(O+'/pick')):
    fs=sorted(f for f in os.listdir(f'{O}/pick/{d}') if f.startswith('atk_'))
    sheet=Image.new('RGBA',(256*8,220*2),(0,0,0,0))
    for k,f in enumerate(fs):
        a=np.array(Image.open(f'{O}/pick/{d}/{f}')).astype(np.float32)
        R,G,B,A=[a[...,i] for i in range(4)]
        m=np.minimum(R,B)-G; sp=(m>35)&(R>110)        # 보라 번짐 제거
        a[...,0]=np.where(sp,R-m*0.8,R); a[...,2]=np.where(sp,B-m*0.8,B)
        al=A>20; lab,n=ndimage.label(al,structure=np.ones((3,3)))
        if n>1:
            sz=ndimage.sum(al,lab,range(1,n+1)); kill=np.isin(lab,[i+1 for i,s in enumerate(sz) if s<300]); a[...,3][kill]=0
        im=Image.fromarray(np.clip(a,0,255).astype(np.uint8),'RGBA').resize((256,220),Image.LANCZOS)
        sheet.paste(im,((k%8)*256,(k//8)*220))
    sheet.save(f'{O}/game/mon_{d}.webp',quality=90,method=6)
    json.dump({'fw':256,'fh':220,'cols':8,'n':len(fs),'ax':128,'ay':197,'st':129,'fps':10 if d.endswith('idle') else 16,'once':d.endswith('fall')},open(f'{O}/game/mon_{d}.json','w'))
    print(d,len(fs))
