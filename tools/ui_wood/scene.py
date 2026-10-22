# 게임 화면(1920×1080)에 우드 대화창(틀 18px)을 얹고 양피지 투명도별 시안을 만듦
import json, numpy as np, importlib.util
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
spec = importlib.util.spec_from_file_location('bb', '/home/claude/ui_wood/build_box.py'); bb = importlib.util.module_from_spec(spec); spec.loader.exec_module(bb)
L = json.load(open('/home/claude/repo/isekai-guild/docs/art/dialog/dialog_layout.json'))
K = 2594 / 1800  # 시안 배율 → 게임
M = '/home/claude/dialog_mock/'
FS = '/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'
import os
if not os.path.exists(FS): FS = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
if not os.path.exists(FB): FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
def lobby():
    bg = Image.new('RGB', (1920, 1080))
    bg.paste(Image.open(M + 'lobby_wall.png').convert('RGB'), (0, 0))
    li = Image.open(M + 'npc_lina_idle.png').convert('RGBA'); bg.paste(li, (800, 120), li)
    bg.paste(Image.open(M + 'lobby_counter.png').convert('RGB'), (0, 428))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(1.5))).enhance(0.78)
    return bg.convert('RGBA')
def scene(palpha, face='serious'):
    im = lobby()
    P = L['portrait']; pf = Image.open(M + f'face_{face}.png').convert('RGBA')
    pf = pf.resize((round(pf.width * P['h'] / pf.height), P['h']), Image.LANCZOS)
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); sh.paste((0, 0, 0, 110), (P['x'] + 10, P['y'] + 16), pf.getchannel('A').filter(ImageFilter.GaussianBlur(12)))
    im.alpha_composite(sh); im.alpha_composite(pf, (P['x'], P['y']))
    B = L['box']
    box = bb.build(round(B['w'] * K), round(B['h'] * K), 18, 1.15, palpha=palpha).resize((B['w'], B['h']), Image.LANCZOS)
    sd = Image.new('RGBA', im.size, (0, 0, 0, 0)); sd.paste((20, 12, 6, 120), (B['x'], B['y'] + 8), box.getchannel('A').point(lambda v: min(v, 200)).filter(ImageFilter.GaussianBlur(8)))
    im.alpha_composite(sd); im.alpha_composite(box, (B['x'], B['y']))
    tag = Image.open('/home/claude/ui_wood/part_nametag.png'); tag = tag.resize((round(tag.width / K), round(tag.height / K)), Image.LANCZOS)
    N = L['name']; tx, ty = N['x'] - 30, B['y'] - tag.height + 26
    im.alpha_composite(tag, (tx, ty))
    g = ImageDraw.Draw(im)
    fn = ImageFont.truetype(FB, N['size']); fs = ImageFont.truetype(FS, 19)
    g.text((tx + 44, ty + tag.height / 2), '리나', font=fn, fill=(255, 246, 236), anchor='lm', stroke_width=2, stroke_fill=(110, 50, 55))
    g.text((tx + 44 + g.textlength('리나', font=fn) + 12, ty + tag.height / 2 + 3), '길드 접수원', font=fs, fill=(255, 228, 220), anchor='lm')
    T = L['text']; ft = ImageFont.truetype(FS, T['size']); fk = ImageFont.truetype(FB, T['size'])
    ink = (74, 46, 28); key = (168, 72, 70)
    parts = [('이번 달 장부 정리가 끝났어요. 식당 지출이 ', ink, ft), ('지난달보다 38G', key, fk), (' 늘었는데…', ink, ft)]
    x, y = T['x'], T['y']
    for t, c, f in parts: g.text((x, y), t, font=f, fill=c); x += g.textlength(t, font=f)
    g.text((T['x'], y + T['size'] * T['lh']), '메뉴를 조정해 볼까요?', font=ft, fill=ink)
    ar = Image.open('/home/claude/ui_wood/part_arrow.png'); ar = ar.resize((round(ar.width / K), round(ar.height / K)), Image.LANCZOS)
    im.alpha_composite(ar, (B['x'] + B['w'] - 40 - ar.width, B['y'] + B['h'] - 30 - ar.height))
    return im.convert('RGB')
if __name__ == '__main__':
    out = '/home/claude/ui_wood/'
    vals = [1.0, 0.85, 0.7, 0.55]
    shots = []
    for v in vals:
        s = scene(v); s.save(out + f'scene_alpha{int(v*100)}.png'); shots.append(s)
    f = ImageFont.truetype(FB, 34); grid = Image.new('RGB', (1920, 1080 + 40), (30, 28, 26))
    for i, (v, s) in enumerate(zip(vals, shots)):
        t = s.resize((960, 540), Image.LANCZOS); grid.paste(t, ((i % 2) * 960, (i // 2) * 560 + 20))
        ImageDraw.Draw(grid).text(((i % 2) * 960 + 20, (i // 2) * 560 + 30), f'양피지 불투명도 {int(v*100)}%', font=f, fill=(255, 225, 170), stroke_width=3, stroke_fill=(0, 0, 0))
    grid.save(out + 'scene_alpha_grid.png')
