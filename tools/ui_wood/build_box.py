# v1 시안에서 재료를 뽑아 한 겹 나무 틀 대화창을 다시 조립 (틀 두께 T, 밝기 조절 가능)
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage as nd
SRC = np.array(Image.open('/home/claude/ui_wood/gemini_wood_v1.png').convert('RGB'))
A = SRC.astype(float)
def brass(x0, y0, x1, y1):
    c = A[y0:y1, x0:x1]; R, G, B = c[..., 0], c[..., 1], c[..., 2]
    m = (G / (R + 1) > 0.74) & (R > 95) & (R - B > 25)
    m = nd.binary_fill_holes(nd.binary_closing(m, iterations=2))
    lab, n = nd.label(m); m = lab == (np.argmax(nd.sum(m, lab, range(1, n + 1))) + 1)
    m = nd.binary_dilation(m, iterations=2)
    al = nd.gaussian_filter(m.astype(float), 0.7)
    out = np.dstack([SRC[y0:y1, x0:x1], (al * 255).astype(np.uint8)])
    im = Image.fromarray(out, 'RGBA'); return im.crop(im.getbbox())
# 재료
TOP = Image.fromarray(SRC[1124:1156, 700:2300]); BOT = Image.fromarray(SRC[1453:1487, 700:2300])
LEFT = TOP.rotate(90, expand=True); RIGHT = TOP.rotate(-90, expand=True)
PARCH = Image.fromarray(SRC[1225:1390, 900:1900])
CORN = {'tl': brass(76, 1120, 200, 1240), 'tr': brass(2550, 1120, 2676, 1240),
        'bl': brass(76, 1385, 200, 1504), }
CORN['br'] = CORN['bl'].transpose(Image.FLIP_LEFT_RIGHT)
BAND0 = 32
def tile_h(src, w, h):
    s = src.resize((src.width, h), Image.LANCZOS); out = Image.new('RGB', (w, h)); x = 0
    while x < w: out.paste(s, (x, 0)); x += s.width
    return out
def tile_v(src, w, h):
    s = src.resize((w, src.height), Image.LANCZOS); out = Image.new('RGB', (w, h)); y = 0
    while y < h: out.paste(s, (0, y)); y += s.height
    return out
def br(im, f):
    if f == 1.0: return im
    out = ImageEnhance.Brightness(im.convert('RGB')).enhance(f)
    if im.mode == 'RGBA': out.putalpha(im.getchannel('A'))
    return out
def build(W, H, T, bright=1.0, line=3, pbright=1.03, palpha=1.0):
    k = T / BAND0
    global TOP, BOT, LEFT, RIGHT
    T0, B0, L0, R0 = TOP, BOT, LEFT, RIGHT
    TOP, BOT, LEFT, RIGHT = br(TOP, bright), br(BOT, bright), br(LEFT, bright), br(RIGHT, bright)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # 가로·세로 띠 (모서리는 놋쇠가 덮음)
    img.paste(tile_h(TOP, W, T), (0, 0)); img.paste(tile_h(BOT, W, T), (0, H - T))
    img.paste(tile_v(LEFT, T, H - 2 * T), (0, T)); img.paste(tile_v(RIGHT, T, H - 2 * T), (W - T, T))
    # 양피지 + 안쪽 경계선 + 안쪽 그림자
    pw, ph = W - 2 * T, H - 2 * T
    p = np.array(br(PARCH, pbright).resize((pw, ph), Image.LANCZOS)).astype(float)
    yy, xx = np.mgrid[0:ph, 0:pw]
    d = np.minimum(np.minimum(yy, xx * 0.6 + 4), np.minimum(ph - 1 - yy + 6, pw - 1 - xx + 6))
    p *= (1 - 0.16 * np.exp(-d / (6 * max(k, .5))))[..., None]
    p = Image.fromarray(np.clip(p, 0, 255).astype(np.uint8))
    img.paste(p, (T, T))
    a = np.array(img).astype(float)
    L = max(2, round(line * k)); dark = np.array([96, 56, 24])
    for i in range(L):
        t = 1 - i / L * 0.4
        a[T + i, T:W - T, :3] = a[T + i, T:W - T, :3] * (1 - t) + dark * t
        a[H - T - 1 - i, T:W - T, :3] = a[H - T - 1 - i, T:W - T, :3] * (1 - t * .7) + dark * t * .7
        a[T:H - T, T + i, :3] = a[T:H - T, T + i, :3] * (1 - t) + dark * t
        a[T:H - T, W - T - 1 - i, :3] = a[T:H - T, W - T - 1 - i, :3] * (1 - t * .7) + dark * t * .7
    # 바깥 외곽선
    o = np.array([48, 22, 8])
    for i in range(2): a[i, :, :3] = o; a[H - 1 - i, :, :3] = o; a[:, i, :3] = o; a[:, W - 1 - i, :3] = o
    if palpha < 1.0:
        a[T + L:H - T - L, T + L:W - T - L, 3] = round(255 * palpha)
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
    # 모서리 둥글게 (바깥)
    r = max(4, round(10 * k)); mask = Image.new('L', (W, H), 0)
    from PIL import ImageDraw; ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), r, fill=255)
    img.putalpha(Image.fromarray(np.minimum(np.array(img.getchannel('A')), np.array(mask))))
    # 놋쇠 모서리
    for key, c in CORN.items():
        c = br(c, 1 + (bright - 1) * .6)
        cs = c.resize((max(8, round(c.width * k)), max(8, round(c.height * k))), Image.LANCZOS)
        x = -round(4 * k) if key[1] == 'l' else W - cs.width + round(4 * k)
        y = -round(4 * k) if key[0] == 't' else H - cs.height + round(4 * k)
        img.alpha_composite(cs, (max(0, x), max(0, y))) if x >= 0 and y >= 0 else img.paste(cs, (x, y), cs)
    TOP, BOT, LEFT, RIGHT = T0, B0, L0, R0
    return img
if __name__ == '__main__':
    import sys
    W, H = 2594, 376
    for T in (32, 24, 18):
        build(W, H, T, 1.15).save(f'/home/claude/ui_wood/box_T{T}.png')
