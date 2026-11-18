exec(open('emo2.py').read().split('CH=[')[0])
def Bs(k,s=58):  # 생각풍선 — 방울이 왼쪽 아래(이름표 쪽)로
    return f'<svg width="{s}" height="{s}" viewBox="0 0 88 88" style="overflow:visible">{DEF}<defs>{G("gc","#fffdf6","#f6e6c4")}</defs><g stroke="{B}" stroke-width="3" fill="url(#gc)"><circle cx="50" cy="38" r="34"/><circle cx="14" cy="70" r="6"/><circle cx="4" cy="83" r="3.5"/></g><path d="M28 22 a26 26 0 0 1 22 -12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/><g transform="translate(26 14) scale(.75)">{I[k]}</g></svg>'
# (이름표 오른쪽 끝 x, 이름표 가운데 y, 이름표 위 y, 아이콘, 대사)
CH=[(885,428,392,'win','「늑대 무리 토벌」, 해냈어!'),(933,527,493,'smile',None),(1170,565,531,'sweat',None)]
h=''
for xr,yc,top,k,txt in CH:
    s=58; h+=f'<div class="emo" style="left:{xr+6}px;top:{yc-s+8}px">{Bs(k,s)}</div>'
    if txt: h+=f'<div class="bub" style="left:{825-34}px;top:{top-8-76}px">{txt}<i></i></div>'
css=open('emo_A.html').read().split('<style>')[1].split('</style>')[0].replace('transform:translateX(-50%);','')
open('emo_C.html','w').write(f'<!doctype html><meta charset="utf-8"><style>{css}</style><div class="st">{h}</div>')
