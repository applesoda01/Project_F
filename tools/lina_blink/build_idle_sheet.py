"""기본 표정 3칸(뜬 눈·반쯤·감음)을 512 셀 가로 시트로 만든다 (흰 배경 제거, 발밑 y=488, 키 432).
입력: art_source/receptionist_blink/lina_00_default_blink_{open,half,closed}.png  출력: lina_illust_idle_blink_sheet_512.png"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
d='art_source/receptionist_blink/'; C=512; charH=432; footY=488
sheet=Image.new('RGBA',(C*3,C),(0,0,0,0))
for k,nm in enumerate(['open','half','closed']):
    im=Image.open(d+f'lina_00_default_blink_{nm}.png').convert('RGB'); a=np.array(im).astype(np.float32)
    lab,n=ndi.label(a.min(2)>236); ids=np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])); ids=ids[ids>0]
    bg=np.isin(lab,ids); al=ndi.gaussian_filter((~bg).astype(np.float32),1.0)
    if k==0: ys=np.where(~bg.all(1))[0]; top=ys.min(); bot=ys.max()
    pm=np.dstack([a*al[...,None],al*255]); s=charH/(bot-top+1); w,h=round(im.width*s),round((bot-top+1)*s)
    arr=np.dstack([np.array(Image.fromarray(pm[top:bot+1,:,i]).resize((w,h),Image.LANCZOS),np.float32) for i in range(4)]); A=arr[...,3:4]
    rgb=np.where(A>1,arr[...,:3]/np.maximum(A/255,1e-4),0).clip(0,255)
    out=Image.fromarray(np.dstack([rgb,A]).round().astype(np.uint8),'RGBA')
    cell=Image.new('RGBA',(C,C),(0,0,0,0)); cell.paste(out,((C-w)//2,footY-h+1),out); sheet.paste(cell,(k*C,0))
sheet.save(d+'lina_illust_idle_blink_sheet_512.png',optimize=True)
