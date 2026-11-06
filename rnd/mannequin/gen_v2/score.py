import sys,glob,json,os,cv2,numpy as np
from scipy import ndimage as ndi
def fig_mask(img):
    bg=np.median(np.concatenate([img[:20,:20].reshape(-1,3),img[:20,-20:].reshape(-1,3),img[-20:,:20].reshape(-1,3),img[-20:,-20:].reshape(-1,3)]),0)
    d=np.abs(img.astype(int)-bg).max(2)>12
    d=cv2.morphologyEx(d.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8)); f=ndi.binary_fill_holes(d)
    lab,n=ndi.label(f)
    if n==0: return f
    sz=ndi.sum(f,lab,range(1,n+1)); return lab==(1+int(np.argmax(sz)))
def score(path,T):
    img=cv2.imread(path)
    if img.shape[:2]!=(1024,1024): img=cv2.resize(img,(1024,1024))
    M=fig_mask(img); iou=(M&T).sum()/max(1,(M|T).sum())
    er=cv2.erode(M.astype(np.uint8),np.ones((15,15),np.uint8)).astype(bool); px=img[er].reshape(-1,3).astype(float)
    if len(px)<100: return dict(iou=float(iou),aux_ok=False,pass_=False)
    med=np.median(px,0); off=float((np.abs(px-med).max(1)>40).mean()); dark=float((cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)[er]<90).mean())
    aux=(off<0.03) and (dark<0.02)
    return dict(iou=round(float(iou),4),off=round(off,4),dark=round(dark,4),aux_ok=bool(aux),pass_=bool(iou>=0.9 and aux))
if __name__=='__main__':
    d,silp,tag=sys.argv[1:4]; T=cv2.imread(silp,0)<128
    fs=sorted(glob.glob(d+'/*.png')); res=[];cells=[]
    for f in fs:
        r=score(f,T); r['file']=os.path.basename(f); res.append(r)
        im=cv2.resize(cv2.imread(f),(320,320)); ok=r['pass_']
        cv2.putText(im,f"{r['file'][2:7]} iou{r['iou']:.2f} {'OK' if ok else 'NG'}",(4,18),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,140,0) if ok else (0,0,255),1); cells.append(im)
    json.dump(res,open(f'{tag}_scores.json','w'),indent=1)
    cv2.imwrite(f'{tag}_sheet.jpg',np.vstack([np.hstack(cells[i:i+5]) for i in range(0,len(cells),5)]),[cv2.IMWRITE_JPEG_QUALITY,85])
    ious=[r['iou'] for r in res]
    print(tag,'합격',sum(r['pass_'] for r in res),'/',len(res),'iou>=0.9',sum(i>=0.9 for i in ious),'iou 평균',round(float(np.mean(ious)),3),'최대',max(ious),'aux_ok',sum(r['aux_ok'] for r in res))
