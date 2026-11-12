import numpy as np, sys
from PIL import Image, ImageEnhance
from scipy import ndimage as nd
import importlib.util
spec=importlib.util.spec_from_file_location('bb','/home/claude/ui_wood/build_box.py'); bb=importlib.util.module_from_spec(spec); spec.loader.exec_module(bb)
src=Image.open('/home/claude/ui_wood/gemini_wood_v1.png').convert('RGB'); A=np.array(src).astype(float)
# 이름표 (작은 돌기 제거)
x0,y0,x1,y1=196,1076,620,1186
c=A[y0:y1,x0:x1]; R,G,B=c[...,0],c[...,1],c[...,2]
m=((R-G>22)&(R>110)&(B>G-15))|((G/(R+1)>0.72)&(R>110)&(R-B>25))
m=nd.binary_fill_holes(nd.binary_closing(m,iterations=3)); m=nd.binary_opening(m,iterations=3)
lab,n=nd.label(m); m=lab==(np.argmax(nd.sum(m,lab,range(1,n+1)))+1); m=nd.binary_dilation(nd.binary_fill_holes(m),iterations=2)
tag=Image.fromarray(np.dstack([np.array(src)[y0:y1,x0:x1],(nd.gaussian_filter(m.astype(float),.7)*255).astype(np.uint8)]),'RGBA')
tag.save('/home/claude/ui_wood/part_nametag.png')
# 넘김 화살표
ax0,ay0,ax1,ay1=2430,1335,2520,1400
c2=A[ay0:ay1,ax0:ax1]; R,G,B=c2[...,0],c2[...,1],c2[...,2]
m2=((G/(R+1)>0.62)&(R>70)&((R-B)/(R+1)>0.33))|((R<120)&(G<100)&(B<70)&(R-B>15))
m2=nd.binary_fill_holes(nd.binary_closing(m2,iterations=2)); lab,n=nd.label(m2); m2=lab==(np.argmax(nd.sum(m2,lab,range(1,n+1)))+1)
arrow=Image.fromarray(np.dstack([np.array(src)[ay0:ay1,ax0:ax1],(nd.gaussian_filter(m2.astype(float),.6)*255).astype(np.uint8)]),'RGBA')
arrow=arrow.crop(arrow.getbbox()); arrow.save('/home/claude/ui_wood/part_arrow.png')
BG=(84,79,74)
def mock(T, bright=1.15):
    im=src.copy()
    # 기존 대화창·그림자 지우기
    im.paste(BG,(60,1112,2700,1530))
    # 나머지 부품 밝게 (배경 제외)
    a=np.array(im).astype(float); bgm=(np.abs(a-np.array(BG)).sum(2)<30)
    b=np.array(ImageEnhance.Brightness(im).enhance(1+(bright-1)*.8)).astype(float)
    a[~bgm]=b[~bgm]; im=Image.fromarray(a.astype(np.uint8)).convert('RGBA')
    box=bb.build(2594,376,T,bright)
    # 그림자
    sh=Image.new('RGBA',box.size,(0,0,0,0)); sa=np.array(box.getchannel('A')).astype(float)
    from PIL import ImageFilter
    shadow=Image.fromarray((sa*0.45).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))
    im.paste((30,24,20,255),(78,1132),shadow)
    im.alpha_composite(box,(78,1124))
    t=bb.br(tag,1+(bright-1)*.8); im.alpha_composite(t,(x0,y0))
    im.alpha_composite(bb.br(arrow,1.1),(2672-T-40-arrow.width,1500-T-30-arrow.height))
    return im.convert('RGB')
if __name__=='__main__':
    for T in map(int,sys.argv[1:]): mock(T).save(f'/home/claude/ui_wood/wood_v2_T{T}.png')
