
import importlib.util, numpy as np
from PIL import Image
spec=importlib.util.spec_from_file_location('st','/tmp/hs/stretch3.py'); st=importlib.util.module_from_spec(spec); spec.loader.exec_module(st)
def stretch_regions(im, roof, wall, eave, L=310, feather=6):
    # roof/wall: dict(c,bL) ; eave: (x0,y0) point on eave line, slope 0.52
    oR=st.stretch(im,c=roof['c'],bL=roof['bL'],L=L,poly=None,wpolys=[],blend=roof.get('blend',7))
    oW=st.stretch(im,c=wall['c'],bL=wall['bL'],L=L,poly=None,wpolys=[],blend=wall.get('blend',0))
    W,H=im.size; pad=int(round(L*0.52))+6
    a=np.array(oR).astype(float); b=np.array(oW).astype(float)
    OH,OW=a.shape[:2]; Y,X=np.mgrid[0:OH,0:OW]
    ly=pad+eave[1]-0.52*(X-eave[0])
    t=np.clip((Y-ly)/feather+0.5,0,1)[...,None]   # 0 roof, 1 wall
    wa=a[...,3:4]/255*(1-t)+1e-6; wb=b[...,3:4]/255*t+1e-6
    col=(a[...,:3]*wa+b[...,:3]*wb)/(wa+wb); al=a[...,3:4]*(1-t)+b[...,3:4]*t
    out=np.concatenate([col,al],-1).round().astype(np.uint8)
    return Image.fromarray(out)

def stretch_multi(im, regs, lines, L=310, feather=6):
    # regs: list of dict(c,bL,blend) ordered top->bottom; lines: list of (x0,y0) points, slope 0.52
    outs=[np.array(st.stretch(im,c=r['c'],bL=r['bL'],L=L,poly=None,wpolys=[],blend=r.get('blend',0))).astype(float) for r in regs]
    pad=int(round(L*0.52))+6
    OH,OW=outs[0].shape[:2]; Y,X=np.mgrid[0:OH,0:OW]
    ts=[np.clip((Y-(pad+ly[1]-0.52*(X-ly[0])))/feather+0.5,0,1)[...,None] for ly in lines]
    # weights: region0=1-t0 ; region k = t_{k-1}*(1-t_k) ; last = t_last
    ws=[1-ts[0]]
    for k in range(1,len(regs)-1): ws.append(ts[k-1]*(1-ts[k]))
    ws.append(ts[-1])
    num=0; den=1e-6
    colsum=0; alsum=0; wsum=1e-6
    for o,w in zip(outs,ws):
        wa=o[...,3:4]/255*w+1e-6
        colsum=colsum+o[...,:3]*wa; wsum=wsum+wa; alsum=alsum+o[...,3:4]*w
    out=np.concatenate([colsum/wsum,alsum],-1).round().clip(0,255).astype(np.uint8)
    return Image.fromarray(out)
