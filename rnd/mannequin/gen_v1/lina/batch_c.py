import sys, glob, json, os, cv2, numpy as np
from measure import measure_c
def run(d, tag):
    fs = sorted(glob.glob(os.path.join(d,'*.png'))); res=[]
    for f in fs: r=measure_c(f); r['file']=os.path.basename(f); res.append(r)
    ok=sum(r['pass_'] for r in res)
    print(f'{tag}: {len(res)}장 마네킹 일치 합격 {ok}장, recall 평균 {np.mean([r["recall"] for r in res]):.3f}, extra 평균 {np.mean([r["extra"] for r in res]):.3f}')
    json.dump(res, open(f'/tmp/mq3/{tag}_scores.json','w'), ensure_ascii=False, indent=1)
    cells=[]
    for f,r in zip(fs,res):
        im=cv2.resize(cv2.imread(f),(320,320)); cv2.putText(im,f"r{r['recall']:.2f} x{r['extra']:.2f} {'OK' if r['pass_'] else 'NG'}",(4,18),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,0,255) if not r['pass_'] else (0,140,0),1); cells.append(im)
    while len(cells)%4: cells.append(np.full((320,320,3),255,np.uint8))
    cv2.imwrite(f'/tmp/mq3/{tag}_sheet.jpg', np.vstack([np.hstack(cells[i:i+4]) for i in range(0,len(cells),4)]), [cv2.IMWRITE_JPEG_QUALITY,82])
if __name__=='__main__': run(sys.argv[1], sys.argv[2])
