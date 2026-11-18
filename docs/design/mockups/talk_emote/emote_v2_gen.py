import math,sys
B='#5a3519'
def burst(cx,cy,r1,r2,n):
    return ' '.join(f"{cx+(r1 if i%2==0 else r2)*math.cos(math.pi*i/n-math.pi/2):.1f},{cy+(r1 if i%2==0 else r2)*math.sin(math.pi*i/n-math.pi/2):.1f}" for i in range(n*2))
def G(id,a,b): return f'<linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'
DEF='<defs>'+G('gy','#fff6b0','#f4b62c')+G('gb','#d8f2ff','#3f9be0')+G('go','#ffd0a8','#ee7d3c')+G('gr','#ffb3b8','#e23d55')+G('gx','#ff8a7a','#d62f2f')+G('gf','#fff0b8','#f6bf45')+G('gp','#c7cdff','#6577ea')+G('gs','#fffbd0','#ffc93a')+'</defs>'
def S(shape,fill,extra=''):  # 스티커: 흰 테두리 → 갈색 선 → 그라데이션 면 → 광택
    return f'<g stroke-linejoin="round" stroke-linecap="round"><g fill="#fff" stroke="#fff" stroke-width="11">{shape}</g><g fill="url(#{fill})" stroke="{B}" stroke-width="3.2">{shape}</g>{extra}</g>'
gl=lambda x,y,rx,ry,r=0:f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff" opacity=".75" transform="rotate({r} {x} {y})"/>'
I={
'win':S(f'<polygon points="{burst(32,32,28,20,9)}"/>','gy',f'<rect x="28.5" y="16" width="7" height="19" rx="3.5" fill="{B}"/><circle cx="32" cy="43.5" r="4" fill="{B}"/>'+gl(21,20,4,2.2,-35)),
'sweat':S('<path d="M32 6 C25 18 13 29 13 40 a19 19 0 0 0 38 0 C51 29 39 18 32 6Z"/>','gb',gl(24,40,3.6,7,18)+gl(28,26,1.8,3,18)),
'note':S('<path d="M22 46 V16 L50 9 V40 H44 V20 L28 24 V46Z"/><ellipse cx="16" cy="46" rx="9" ry="7" transform="rotate(-20 16 46)"/><ellipse cx="44" cy="40" rx="9" ry="7" transform="rotate(-20 44 40)"/>','go',gl(13,43,3,1.8,-20)+gl(41,37,3,1.8,-20)),
'heart':S('<path d="M32 55 C11 41 5 28 12 18 C19 9 29 11 32 20 C35 11 45 9 52 18 C59 28 53 41 32 55Z"/>','gr',gl(19,24,3.6,6,35)+gl(25,17,1.8,1.8)),
'anger':S('<path d="M23 7 L29 7 Q29 29 7 29 L7 23 Q23 23 23 7Z"/><path d="M41 7 L35 7 Q35 29 57 29 L57 23 Q41 23 41 7Z"/><path d="M23 57 L29 57 Q29 35 7 35 L7 41 Q23 41 23 57Z"/><path d="M41 57 L35 57 Q35 35 57 35 L57 41 Q41 41 41 57Z"/>','gx'),
'smile':S('<circle cx="32" cy="33" r="24"/>','gf',f'<path d="M19 30 q5 -6.5 10 0 M35 30 q5 -6.5 10 0" fill="none" stroke="{B}" stroke-width="3.6" stroke-linecap="round"/><path d="M22 38 q10 12 20 0Z" fill="#c4553f" stroke="{B}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="15" cy="38" rx="4.5" ry="2.8" fill="#ff8f8f" opacity=".75"/><ellipse cx="49" cy="38" rx="4.5" ry="2.8" fill="#ff8f8f" opacity=".75"/>'+gl(22,18,5,2.5,-25)),
'qex':S('<path d="M8 22 C8 9 30 7 31 20 C32 28 24 30 24 37 H16 C16 27 23 26 23 21 C23 16 16 16 15 22Z"/><circle cx="20" cy="49" r="5.5"/>','gp')+S('<path d="M41 8 H51 L49 38 H43Z"/><circle cx="46" cy="49" r="5.5"/>','gy'),
'spark':S('<path d="M27 8 Q30 31 52 34 Q30 37 27 60 Q24 37 2 34 Q24 31 27 8Z"/><path d="M50 2 Q51.6 12.5 61 14 Q51.6 15.5 50 26 Q48.4 15.5 39 14 Q48.4 12.5 50 2Z"/>','gs',gl(22,27,1.8,4,0)),
}
NAME={'win':'해냈다!','sweat':'식은땀','note':'신남','heart':'고마워','anger':'욱','smile':'헤헤','qex':'어?!','spark':'반짝'}
def A(k,s=58): return f'<svg width="{s}" height="{s}" viewBox="-6 -6 76 76" style="overflow:visible">{DEF}{I[k]}</svg>'
def Bv(k,s=70):  # 둥근 생각풍선형
    return f'<svg width="{s}" height="{s*1.25:.0f}" viewBox="0 0 80 100">{DEF}<defs>{G("gc","#fffdf6","#f6e6c4")}</defs><g stroke="{B}" stroke-width="3" fill="url(#gc)"><circle cx="40" cy="38" r="34"/><circle cx="46" cy="80" r="6"/><circle cx="41" cy="93" r="3.5"/></g><path d="M18 22 a26 26 0 0 1 22 -12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/><g transform="translate(16 14) scale(.75)">{I[k]}</g></svg>'
CH=[(825,392,'win','「늑대 무리 토벌」, 해냈어!'),(880,493,'smile',None),(1117,531,'sweat',None)]
def page(var):
    h=''
    for x,top,k,txt in CH:
        svg=A(k) if var=='A' else Bv(k,60)
        eh=58 if var=='A' else 75
        h+=f'<div class="emo" style="left:{x}px;top:{top-6-eh}px">{svg}</div>'
        if txt:
            by=top-6-eh-8
            h+=f'<div class="bub" style="left:{x-34}px;top:{by-76}px">{txt}<i></i></div>'
    return f'''<!doctype html><meta charset="utf-8"><style>body{{margin:0}}.st{{position:relative;width:1920px;height:1080px;background:url(emo_lobby.png)}}
.emo{{position:absolute;transform:translateX(-50%);filter:drop-shadow(0 3px 2px rgba(40,22,8,.35))}}
.bub{{position:absolute;white-space:nowrap;font:700 26px "Noto Sans KR",sans-serif;color:#3a2616;background:#fffaf0;border:3px solid #6b4527;border-radius:12px;padding:0 24px;height:54px;line-height:52px;box-shadow:0 3px 8px rgba(40,25,12,.35)}}
.bub i{{position:absolute;left:22px;bottom:-19px;width:0;height:0;border:11px solid transparent;border-top:18px solid #6b4527;border-bottom:0}}
.bub i:after{{content:"";position:absolute;left:-7px;top:-21px;border:7px solid transparent;border-top:14px solid #fffaf0;border-bottom:0}}</style><div class="st">{h}</div>'''
for v in 'AB': open(f'emo_{v}.html','w').write(page(v))
sheet=''.join(f'<div class="c"><div class="r">{A(k,76)}</div><div class="r">{Bv(k,72)}</div><b>{NAME[k]}</b></div>' for k in I)
open('emo_sheet.html','w').write(f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;padding:20px;background:#c99a62;font:700 15px "Noto Sans KR",sans-serif;color:#3b2a1e}}.g{{display:grid;grid-template-columns:repeat(8,110px);gap:8px}}.c{{background:#e9c99a;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0}}.r{{height:96px;display:grid;place-items:center;filter:drop-shadow(0 3px 2px rgba(40,22,8,.35))}}.lab{{margin:0 0 8px}}</style><div class="lab">위 줄 A 스티커형 · 아래 줄 B 생각풍선형 (나무 바닥 색 위)</div><div class="g">{sheet}</div>')
