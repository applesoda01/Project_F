"""staged raw/cut PNG -> trimmed webp layers + contact sheets for review.
usage: python3 op_proc.py <staged_dir> <out_dir>"""
import sys, os, re, glob
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out + "/layers", exist_ok=True); os.makedirs(out + "/sheets", exist_ok=True)
items = {}
for p in sorted(glob.glob(src + "/**/*.png", recursive=True)):
    kind = "cut" if os.sep + "cut" + os.sep in p else "raw"
    m = re.match(r"(op\d\d_[a-z_]+)_s(\d+)_", os.path.basename(p))
    if not m: continue
    lid, seed = m.group(1), m.group(2)
    items.setdefault((lid, seed), {})[kind] = p
from PIL import ImageOps
def sepia(im):
    a = im.split()[3] if im.mode == "RGBA" else None
    g = ImageOps.autocontrast(im.convert("L"), cutoff=0.5)
    out = ImageOps.colorize(g, black=(28, 19, 11), white=(240, 228, 203), mid=(150, 118, 80)).convert("RGBA")
    if a is not None: out.putalpha(a)
    return out
meta = {}
for (lid, seed), d in sorted(items.items()):
    if "cut" in d:
        im = Image.open(d["cut"]).convert("RGBA")
        a = im.split()[3]
        bb = a.point(lambda v: 255 if v > 24 else 0).getbbox() or (0, 0) + im.size
        cov = sum(1 for v in a.get_flattened_data() if v > 127) / (im.width * im.height)
        im = im.crop(bb)
    else:
        im = Image.open(d["raw"]).convert("RGB"); cov = 1.0; bb = (0, 0) + im.size
    im = sepia(im)
    name = f"{lid}_s{seed}.webp"
    im.save(f"{out}/layers/{name}", "WEBP", quality=82, method=4)
    meta[name] = dict(lid=lid, seed=seed, w=im.width, h=im.height, cov=round(cov, 3), bb=bb)
# contact sheet per shot (checker bg so alpha is visible)
shots = sorted({m["lid"][:4] for m in meta.values()})
for s in shots:
    names = [n for n in sorted(meta) if n.startswith(s)]
    th = 300; tiles = []
    for n in names:
        im = Image.open(f"{out}/layers/{n}").convert("RGBA")
        r = th / im.height; im = im.resize((max(1, int(im.width * r)), th))
        bg = Image.new("RGBA", im.size, (90, 140, 90, 255)); bg.alpha_composite(im)
        dr = ImageDraw.Draw(bg); dr.rectangle((0, 0, bg.width, 18), fill=(0, 0, 0, 200)); dr.text((4, 3), n[:-5] + f" cov{meta[n]['cov']}", fill=(255, 255, 0, 255))
        tiles.append(bg)
    W = 1600; rows = []; row = []; x = 0
    for t in tiles:
        if x + t.width > W and row: rows.append(row); row = []; x = 0
        row.append(t); x += t.width + 6
    if row: rows.append(row)
    sheet = Image.new("RGB", (W, len(rows) * (th + 6)), (30, 30, 30))
    for i, r in enumerate(rows):
        x = 0
        for t in r: sheet.paste(t, (x, i * (th + 6))); x += t.width + 6
    sheet.save(f"{out}/sheets/{s}.jpg", quality=80)
import json; json.dump(meta, open(out + "/meta.json", "w"), indent=0)
print(len(meta), "layers;", shots)
