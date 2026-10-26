import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
names={'s1.png':['a_cream_gold','b_brown_gold','c_cream_brown'],'s2.png':['d_locked_grey','e_highlight_gold']}
out=[]
for f,nm in names.items():
    im=Image.open(f).convert('RGB');a=np.asarray(im).astype(int)
    mx=a.max(2);mn=a.min(2)
    grayish=(mx-mn<14)&(mx>165)           # 흰 배경·회색 그림자
    lab,n=ndi.label(grayish)
    outside=np.zeros_like(grayish)
    for l in set(lab[0,:])|set(lab[-1,:])|set(lab[:,0])|set(lab[:,-1]):
        if l: outside|=(lab==l)
    body=~outside
    body=ndi.binary_opening(body,iterations=2)
    body=ndi.binary_fill_holes(body)
    lab2,n2=ndi.label(body)
    sizes=ndi.sum(body,lab2,range(1,n2+1))
    idx=[i+1 for i in np.argsort(-sizes)[:len(nm)]]
    comps=sorted(idx,key=lambda i:ndi.center_of_mass(lab2==i)[0])
    for c,name in zip(comps,nm):
        m=(lab2==c)
        ys,xs=np.where(m);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        rgba=np.dstack([a[y0:y1,x0:x1].astype(np.uint8),(m[y0:y1,x0:x1]*255).astype(np.uint8)])
        # 가장자리 부드럽게
        al=Image.fromarray(rgba[:,:,3]).filter(ImageFilter.GaussianBlur(0.8));rgba[:,:,3]=np.asarray(al)
        im2=Image.fromarray(rgba,'RGBA');h=im2.height;w=im2.width
        print(name,w,h,round(w/h,2))
        T=int(round(h*680/156)); half=T//2
        L=im2.crop((0,0,half,h));R=im2.crop((w-(T-half),0,w,h))
        cmp=Image.new('RGBA',(T,h));cmp.paste(L,(0,0));cmp.paste(R,(half,0))
        # 이음매 보정: 가운데 24px 블렌드
        arr=np.asarray(cmp).astype(float);s=half
        for k in range(-12,12):
            t=(k+12)/24
            x=s+k
            arr[:,x,:3]=arr[:,s-12-1,:3]*(1-t)+arr[:,s+12,:3]*t
        cmp=Image.fromarray(arr.astype(np.uint8),'RGBA')
        body=cmp.resize((680,156),Image.LANCZOS)
        canvas=Image.new('RGBA',(680,168),(0,0,0,0))
        sh=Image.new('RGBA',(680,168),(0,0,0,0));alpha=body.getchannel('A')
        sa=Image.new('L',(680,168),0);sa.paste(alpha,(0,10));sa=sa.filter(ImageFilter.GaussianBlur(3)).point(lambda v:int(v*0.4))
        sh.putalpha(sa);canvas=Image.alpha_composite(canvas,sh)
        canvas.alpha_composite(body,(0,0))
        canvas.save(f'plaque_gpt_{name}_680x168.png');out.append(f'plaque_gpt_{name}_680x168.png')
# 확인용 시트
W=Image.new('RGBA',(700,len(out)*182),(60,45,35,255))
for i,o in enumerate(out):
    im=Image.open(o);W.paste(im,(10,i*182+4),im)
W.save('gpt_sheet.png')
