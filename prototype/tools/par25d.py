# 2.5D parallax: orig + clean plate -> foreground mask -> two layers with different push-in
# usage: par25d.py orig plate out.mp4 fgZoom bgZoom anchorX anchorY(0..1, bg focus) [fgAnchorY]
import sys, subprocess, numpy as np
from PIL import Image, ImageFilter
o, p, out = sys.argv[1:4]
fz, bz, ax, ay = map(float, sys.argv[4:8])
fay = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
W, H, N, FPS = 1280, 720, 96, 24
def fit(im):
    im = im.convert('RGB'); s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l = (im.width - W) // 2; t = (im.height - H) // 2
    return im.crop((l, t, l + W, t + H))
O, P = fit(Image.open(o)), fit(Image.open(p))
bl = lambda im: np.asarray(im.filter(ImageFilter.GaussianBlur(3)), np.int16)
d = np.abs(bl(O) - bl(P)).max(2)
TH = int(__import__('os').environ.get('TH', '45'))
mk = (d > TH)
bx = __import__('os').environ.get('BOX')
if bx:
    x0, y0, x1, y1 = [float(v) for v in bx.split(',')]
    keep = np.zeros_like(mk); keep[int(y0*H):int(y1*H), int(x0*W):int(x1*W)] = 1; mk &= keep.astype(bool)
from scipy import ndimage
mk = ndimage.binary_closing(mk, iterations=4); mk = ndimage.binary_fill_holes(mk)
lab, n = ndimage.label(mk); sz = ndimage.sum(mk, lab, range(1, n + 1))
mk = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v > 1500])
m = Image.fromarray((mk * 255).astype(np.uint8))
sg = __import__('os').environ.get('SEG')
if sg:  # external mask (white = foreground)
    m = Image.fromarray(((np.asarray(fit(Image.open(sg)).convert('L')) > 160) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
# background = original, with the clean plate patched only where the foreground was
P = Image.composite(P, O, m.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(4)))
m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))   # close holes
m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
m.save(out.replace('.mp4', '_mask.png'))
def zoom(im, z, cx, cy):
    w, h = W / z, H / z; l = cx * W - w * cx; t = cy * H - h * cy
    return im.transform((W, H), Image.EXTENT, (l, t, l + w, t + h), Image.BICUBIC)
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
for i in range(N):
    t = i / (N - 1); e = t * t * (3 - 2 * t)
    bg = zoom(P, 1 + (bz - 1) * e, ax, ay)
    fg = zoom(O, 1 + (fz - 1) * e, 0.5, fay); fm = zoom(m, 1 + (fz - 1) * e, 0.5, fay)
    bg.paste(fg, (0, 0), fm)
    ff.stdin.write(bg.tobytes())
ff.stdin.close(); ff.wait(); print('ok', out)
