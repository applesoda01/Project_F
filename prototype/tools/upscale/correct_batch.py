# 보정: ×4 복원 후 원래 크기로 축소. 투명 PNG는 원래 알파를 그대로 씀(같은 크기라 다시 계산할 필요 없음)
import sys, os, glob, time, numpy as np, onnxruntime as ort
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from upscale_image import sr_tiled
from upscale_sheet import bleed
model, src_root, dst_root = sys.argv[1:4]
so = ort.SessionOptions(); so.intra_op_num_threads = 2
sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
files = sorted(glob.glob(os.path.join(src_root, '*/*.png')), key=lambda f: os.path.getsize(f))
for f in files:
    rel = os.path.relpath(f, src_root); dst = os.path.join(dst_root, rel)
    if os.path.exists(dst): continue
    os.makedirs(os.path.dirname(dst), exist_ok=True); t0 = time.time()
    im = Image.open(f); has_a = im.mode == 'RGBA'; a = np.array(im.convert('RGBA'))
    rgb = sr_tiled(sess, (bleed(a) if has_a else a)[..., :3])
    out = Image.fromarray(rgb).resize(im.size, Image.LANCZOS)
    if has_a: out.putalpha(im.getchannel('A'))
    out.save(dst + '.tmp.png', optimize=True); os.replace(dst + '.tmp.png', dst)
    print(rel, round(time.time() - t0), 's', flush=True)
print('ALL DONE', flush=True)
