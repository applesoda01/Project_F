import sys, glob, json, os, cv2, numpy as np
from measure import measure
def run(dirpath, tag):
    fs = sorted(glob.glob(os.path.join(dirpath, '*.png')))
    res = []
    for f in fs: r = measure(f); r['file'] = os.path.basename(f); res.append(r)
    n = len(res); ok = sum(1 for r in res if r.get('pass_'))
    ious = [r['iou'] for r in res]
    print(f'{tag}: {n}장, 합격 {ok}장, IoU 평균 {np.mean(ious):.3f} 최소 {min(ious):.3f} 최대 {max(ious):.3f}')
    for r in res:
        if not r.get('pass_'): print('  불합격', r)
    json.dump(res, open(f'/tmp/mq3/{tag}_scores.json','w'), ensure_ascii=False, indent=1)
    # 시트
    cells = []
    for f, r in zip(fs, res):
        im = cv2.resize(cv2.imread(f), (256,256)); 
        cv2.putText(im, f"{r['iou']:.2f} {'OK' if r.get('pass_') else 'NG'}", (6,22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255) if not r.get('pass_') else (0,140,0), 2)
        cells.append(im)
    while len(cells) % 5: cells.append(np.full((256,256,3),255,np.uint8))
    rows = [np.hstack(cells[i:i+5]) for i in range(0,len(cells),5)]
    cv2.imwrite(f'/tmp/mq3/{tag}_sheet.jpg', np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 80])
    return ok, n
if __name__ == '__main__': run(sys.argv[1], sys.argv[2])
