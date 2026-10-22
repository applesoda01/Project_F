# 큰 일러스트 업스케일: 타일로 나눠 Real-ESRGAN anime_6B(ONNX) ×4 → 원하는 배율로 축소. 투명 PNG도 지원
import sys, time, numpy as np, onnxruntime as ort
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))
from upscale_sheet import bleed
def sr_tiled(sess, rgb, tile=192, pad=16):
    H, W, _ = rgb.shape; out = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad); y1, x1 = min(H, y + tile + pad), min(W, x + tile + pad)
            t = rgb[y0:y1, x0:x1].astype(np.float32).transpose(2, 0, 1)[None] / 255.0
            o = sess.run(None, {'input': t})[0][0].transpose(1, 2, 0)
            ty, tx = (y - y0) * 4, (x - x0) * 4; th, tw = min(tile, H - y) * 4, min(tile, W - x) * 4
            out[y * 4:y * 4 + th, x * 4:x * 4 + tw] = o[ty:ty + th, tx:tx + tw]
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
if __name__ == '__main__':
    model, src, dst, scale = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
    so = ort.SessionOptions(); so.intra_op_num_threads = 2
    sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
    im = Image.open(src); has_a = im.mode in ('RGBA', 'LA') or 'transparency' in im.info
    a = np.array(im.convert('RGBA')); t0 = time.time()
    rgb = sr_tiled(sess, (bleed(a) if has_a else a)[..., :3])
    out = Image.fromarray(rgb)
    if has_a: out.putalpha(Image.fromarray(sr_tiled(sess, np.repeat(a[..., 3:4], 3, 2))[..., 0]))
    W, H = im.size; out = out.resize((round(W * scale), round(H * scale)), Image.LANCZOS)
    out.save(dst, optimize=True); print('done', out.size, round(time.time() - t0, 1), 's')
