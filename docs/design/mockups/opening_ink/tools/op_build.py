"""build parallax preview page. usage: python3 op_build.py <out_dir> picks.json"""
import sys, json, os
out = sys.argv[1]; picks = json.load(open(sys.argv[2]))
meta = json.load(open(out + "/meta.json"))
def f(lid):
    seed = picks[lid]; n = f"{lid}_s{seed}.webp"; assert n in meta, n; return n
def bg(lid, d=0.35, extra=None): return dict(f=f(lid), bg=1, d=d, **(extra or {}))
def lay(lid, x, y, h, d, flip=0, **kw): return dict(f=f(lid), x=x, y=y, h=h, d=d, flip=flip, **kw)
party = ["bram", "celine", "thomas", "kyle", "master"]
SH = [
 dict(n=1, dur=5, cam="push", tx="그날 우리는, 봉인이 약해지고 있다는 걸 알리러 가던 길이었다.",
      L=[bg("op01_bg"), lay("op01_mid", 14, 104, 70, 1.6)] + [lay(f"op01_ch_{k}", x, 86, h, 0.9) for k, x, h in zip(party, [36, 44, 52, 60, 68], [36, 32, 33, 31, 33])]),
 dict(n=2, dur=3, cam="up", tx="", L=[bg("op02_bg"), lay("op02_mid", 50, 84, 74, 0.6), lay("op02_fg", 84, 106, 46, 1.4)]),
 dict(n=3, dur=4, cam="push", tx="막을 수 없었다.",
      L=[bg("op03_bg"), lay("op03_mid", 50, 78, 85, 0.55)] + [lay(f"op03_ch_{k}", x, 108, h, 1.1) for k, x, h in zip(party, [14, 32, 50, 68, 86], [62, 56, 58, 54, 58])]),
 dict(n=4, dur=3, cam="flash", tx="그리고… 정신을 잃었다.", L=[]),
 dict(n=5, dur=3, cam="wake", tx="", L=[bg("op05_bg", 0.5)]),
 dict(n=6, dur=4, cam="push", tx="눈을 떴을 때, 한쪽 다리가 없었다.", L=[bg("op06_bg"), lay("op06_mid", 50, 104, 58, 1.2)]),
 dict(n=7, dur=4, cam="side", tx="살아남은 건, 나 혼자였다.", L=[bg("op07_bg", 0.3), lay("op07_fg", 50, 100, 100, 1.3, cover=1)]),
 dict(n=8, dur=5, cam="push", tx="다리를 잃은 궁수는… 더 이상 모험가가 아니다.", L=[bg("op08_bg", 0.2), lay("op08_fg", 50, 104, 96, 1.2), lay("op08_badge", 47, 66, 22, 1.25)]),
 dict(n=9, dur=4, cam="push", tx="그래도 이 마을을 떠날 수는 없었다.", L=[bg("op09_bg", 0.2), lay("op09_fg", 50, 100, 88, 1.3)]),
 dict(n=10, dur=5, cam="side", tx="이곳은, 마왕의 마지막 봉인이 잠든 곳이니까.", L=[bg("op10_bg", 0.25), lay("op10_mid", 50, 102, 30, 0.8), lay("op10_fg", 50, 108, 34, 1.6)]),
 dict(n=11, dur=5, cam="push", tx="내가 갈 수 없다면… 갈 사람을 키우면 된다.", L=[bg("op11_bg"), lay("op11_ch_master", 50, 98, 52, 1.1)]),
 dict(n=12, dur=4, cam="push", tx="리나: 여기가 새 길드죠? 저, 접수원 자리 보고 왔어요!", L=[bg("op12_bg"), lay("op12_ch_lina", 34, 102, 70, 1.1)]),
 dict(n=13, dur=3, cam="pull", tx="이번엔… 아무도 잃지 않는다.", L=[bg("op13_bg"), lay("op13_fg", 30, 108, 34, 1.5)]),
]
for s in SH:
    for l in s["L"]:
        m = meta[l["f"]]; l["ar"] = round(m["w"] / m["h"], 4)
cfg = json.dumps(SH, ensure_ascii=False)
html = open(os.path.join(os.path.dirname(__file__), "op_player.html")).read().replace("/*CFG*/[]", cfg)
open(out + "/index.html", "w").write(html)
print("ok", len(SH))
