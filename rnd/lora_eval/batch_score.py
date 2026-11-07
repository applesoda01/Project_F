"""학습 시트 전체를 score_sheet.score(assemble=True)로 채점해 JSONL로 저장. 사용: python3 batch_score.py 시트폴더 spec.json 출력.jsonl [병렬수]"""
import sys, glob, json, os
from multiprocessing import Pool
import score_sheet as S
def one(a):
    f, sp = a
    try:
        r = S.score(f, sp, None, True); r['id'] = os.path.basename(f)[:-4]; return r
    except Exception as e:
        return {'id': os.path.basename(f)[:-4], 'error': str(e)[:200]}
if __name__ == '__main__':
    d, sp, out = sys.argv[1:4]; n = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    fs = sorted(glob.glob(os.path.join(d, '*.png')))
    with Pool(n) as p, open(out, 'w') as o:
        for r in p.imap(one, [(f, sp) for f in fs]): o.write(json.dumps(r, ensure_ascii=False) + '\n'); o.flush()
