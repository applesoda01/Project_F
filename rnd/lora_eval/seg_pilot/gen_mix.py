import sys,os,random,json,subprocess,numpy as np,cv2
sys.path.insert(0,'/tmp/mq12');sys.path.insert(0,'/home/claude/project_f/rnd/lora_eval')
from mixlib import *
from asm import ORDER
from multiprocessing import Pool
G={'hair':['hairB','hairF','hairTwinB','hairTwinF','hairSideB','hairSideF'],'head':['headB','head','faceNormal'],'body':['body','skirtB','skirtF','hipF'],'arms':['armF','handF','armB','handB'],'legs':['thighF','legF','thighB','legB'],'acc':['acce01','acce02','acce03','tail','tailB']}
names={'hairB':'back hair','hairF':'front hair','hairTwinF':'front twintail','hairTwinB':'back twintail','acce01':'accessory 1','acce03':'accessory 3','headB':'back of head','armF':'front upper arm','head':'head base','handF':'front forearm and hand','armB':'back upper arm','skirtF':'front skirt','skirtB':'back skirt','hairSideF':'front side hair','hairSideB':'back side hair','handB':'back forearm and hand','body':'torso','tail':'tail','acce02':'accessory 2','hipF':'belt','thighF':'front thigh','thighB':'back thigh','legF':'front shin','legB':'back shin','faceNormal':'face expression'}
rows=[0,1,2,3]
def rowof(y): return 0 if y<400 else 1 if y<700 else 2 if y<950 else 3
RN=['top row','second row','third row','bottom row']
def caption(sh):
    caps={0:[],1:[],2:[],3:[]};bg=sh[2,1024+8].astype(int)
    for k,v in sorted(S.items(),key=lambda kv:(kv[1]['y'],kv[1]['x'])):
        x0=1024+v['x'];y0=v['y'];reg=sh[y0:y0+v['h'],x0:x0+v['w']].astype(int)
        if (np.abs(reg-bg).sum(2)>40).mean()>0.01: caps[rowof(v['y'])].append(names[k])
    parts=[RN[r]+': '+', '.join(caps[r]) for r in range(4) if caps[r]]
    return 'character parts sheet, chibi game character assembled on the left, separated body part layers in fixed slots on the right, flat anime style. '+'; '.join(parts)
IDS=sorted(d for d in os.listdir('/tmp/mq12/chars') if os.path.isdir('/tmp/mq12/chars/'+d))
def make(args):
    k,src=args
    parts=gather(dict(src))
    r=build(parts)
    if r is None: return None
    sh,sc=r
    # 얼굴 가림 검사: faceNormal 위에 나중에 그려지는 파츠가 덮는 비율
    vis=1.0
    if 'faceNormal' in parts:
        f=parts['faceNormal'];fa=np.zeros((OH,OW),np.float32);h,w=f['img'].shape[:2]
        y0=max(f['y'],0);x0=max(f['x'],0);y1=min(f['y']+h,OH);x1=min(f['x']+w,OW)
        if y1<=y0 or x1<=x0: return None
        fa[y0:y1,x0:x1]=f['img'][y0-f['y']:y1-f['y'],x0-f['x']:x1-f['x'],3]/255.
        cov=np.zeros((OH,OW),np.float32);after=ORDER[ORDER.index('faceNormal')+1:]
        for n in after:
            if n in parts and n not in ('hipF','armF','handF'):
                p=parts[n];h2,w2=p['img'].shape[:2];ya=max(p['y'],0);xa=max(p['x'],0);yb=min(p['y']+h2,OH);xb=min(p['x']+w2,OW)
                if yb>ya and xb>xa: cov[ya:yb,xa:xb]=np.maximum(cov[ya:yb,xa:xb],p['img'][ya-p['y']:yb-p['y'],xa-p['x']:xb-p['x'],3]/255.)
        vis=float((fa*(1-cov)).sum()/max(fa.sum(),1))
    small=cv2.resize(sh,(1536,704),interpolation=cv2.INTER_LANCZOS4)
    return dict(k=k,src=src,sheet=small,scale=sc,vis=vis,cap=caption(sh),nparts=len(parts))
if __name__=='__main__':
    N=int(sys.argv[1]);random.seed(2026);combos=[];seen=set()
    while len(combos)<N:
        a,b,c=random.sample(IDS,3)
        mode=random.random()
        if mode<0.5: src={'hair':a,'head':a,'body':b,'arms':b,'legs':c,'acc':a}
        elif mode<0.8: src={'hair':a,'head':b,'body':c,'arms':c,'legs':b,'acc':b}
        else:
            d=random.choice(IDS);src={'hair':a,'head':b,'body':c,'arms':d,'legs':c,'acc':a}
        key=tuple(sorted(src.items()))
        if key in seen or len(set(src.values()))<2: continue
        seen.add(key);m={}
        for g,ch in src.items():
            for n in G[g]: m[n]=ch
        combos.append((len(combos),m))
    out='/tmp/mq12/mix/cand';os.makedirs(out,exist_ok=True)
    with Pool(max(1,os.cpu_count())) as p: res=[r for r in p.imap(make,combos,chunksize=4) if r]
    meta=[]
    for r in res:
        fn=f"mix_{r['k']:04d}";cv2.imwrite(f'{out}/{fn}.png',cv2.cvtColor(r['sheet'],cv2.COLOR_RGB2BGR));open(f'{out}/{fn}.txt','w').write(r['cap'])
        meta.append(dict(name=fn,scale=r['scale'],vis=r['vis'],nparts=r['nparts'],src=r['src']))
    json.dump(meta,open('/tmp/mq12/mix/cand_meta.json','w'))
    print(len(res))
