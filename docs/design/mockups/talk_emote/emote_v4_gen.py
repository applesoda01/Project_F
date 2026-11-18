B='#5a3519'
def G(id,a,b): return f'<linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'
DEF='<defs>'+G('fc','#fffefa','#f3e3c6')+G('gr','#ffb3b8','#e23d55')+G('gb','#d8f2ff','#3f9be0')+G('gy','#fff6b0','#f4b62c')+G('gx','#ff8a7a','#d62f2f')+G('go','#ffd0a8','#ee7d3c')+G('gp','#c7cdff','#6577ea')+'</defs>'
FACE=f'<path d="M10 46 C8 26 22 14 44 14 C66 14 80 26 78 46 C77 62 64 72 44 72 C24 72 11 62 10 46Z" fill="url(#fc)" stroke="{B}" stroke-width="3.2"/><path d="M20 30 C25 22 33 19 41 19" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
blush='<ellipse cx="24" cy="52" rx="6" ry="3.5" fill="#ff9a9a" opacity=".65"/><ellipse cx="64" cy="52" rx="6" ry="3.5" fill="#ff9a9a" opacity=".65"/>'
L=lambda d,w=3.4,c=B:f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def S(shape,fill,extra=''): return f'<g stroke-linejoin="round" stroke-linecap="round"><g fill="#fff" stroke="#fff" stroke-width="8">{shape}</g><g fill="url(#{fill})" stroke="{B}" stroke-width="2.6">{shape}</g>{extra}</g>'
star=lambda x,y,r:f'<path d="M{x} {y-r} Q{x+r*.18} {y-r*.18} {x+r} {y} Q{x+r*.18} {y+r*.18} {x} {y+r} Q{x-r*.18} {y+r*.18} {x-r} {y} Q{x-r*.18} {y-r*.18} {x} {y-r}Z"/>'
I={
# 해냈다: 크게 웃는 입 + 반짝 눈 + 옆에 !
'win':FACE+S(star(30,40,7)+star(58,40,7),'gy')+f'<path d="M30 52 Q44 66 58 52Z" fill="#c4553f" stroke="{B}" stroke-width="3" stroke-linejoin="round"/>'+S('<rect x="80" y="2" width="9" height="24" rx="4.5"/><circle cx="84.5" cy="34" r="5"/>','gy'),
# 식은땀: 처진 눈썹 · 물결 입 · 옆이마 땀방울
'sweat':FACE+L('M23 38 L34 33 M65 38 L54 33')+'<circle cx="31" cy="45" r="3.6" fill="'+B+'"/><circle cx="57" cy="45" r="3.6" fill="'+B+'"/>'+L('M34 58 q3.3 -4 6.6 0 q3.3 4 6.6 0 q3.3 -4 6.6 0')+S('<path d="M76 10 C72 18 66 24 66 30 a10 10 0 0 0 20 0 C86 24 80 18 76 10Z"/>','gb'),
# 신남: 감은 웃는 눈 · 벌린 입 · 음표
'note':FACE+L('M24 44 q6 -8 12 0 M52 44 q6 -8 12 0')+f'<path d="M34 52 Q44 64 54 52Z" fill="#c4553f" stroke="{B}" stroke-width="3" stroke-linejoin="round"/>'+blush+S('<path d="M80 30 V4 L94 1 V10 L84 12 V30Z"/><ellipse cx="76" cy="31" rx="7" ry="5.5" transform="rotate(-20 76 31)"/>','go'),
# 고마워: 감은 눈 · 발그레 · 작은 입 · 하트
'heart':FACE+L('M24 44 q6 6 12 0 M52 44 q6 6 12 0')+L('M40 56 q4 4 8 0')+blush+blush.replace('opacity=".65"','opacity=".35"')+S('<path d="M82 36 C68 27 64 18 69 12 C74 6 80 8 82 14 C84 8 90 6 95 12 C100 18 96 27 82 36Z"/>','gr'),
# 욱: 성난 눈썹 · 앙다문 입 · 이마 핏대
'anger':FACE+L('M24 34 L36 40 M64 34 L52 40',4)+'<circle cx="31" cy="45" r="3.4" fill="'+B+'"/><circle cx="57" cy="45" r="3.4" fill="'+B+'"/>'+f'<rect x="33" y="53" width="22" height="9" rx="3" fill="#fff" stroke="{B}" stroke-width="2.8"/>'+L('M40.3 53 V62 M47.6 53 V62',2.2)+S('<path d="M70 4 L74 4 Q74 15 63 15 L63 11 Q70 11 70 4Z"/><path d="M80 4 L76 4 Q76 15 87 15 L87 11 Q80 11 80 4Z"/><path d="M70 28 L74 28 Q74 17 63 17 L63 21 Q70 21 70 28Z"/><path d="M80 28 L76 28 Q76 17 87 17 L87 21 Q80 21 80 28Z"/>','gx'),
# 헤헤: ^^ 눈 · 미소 · 발그레
'smile':FACE+L('M24 45 q6 -8 12 0 M52 45 q6 -8 12 0')+L('M36 54 q8 7 16 0')+blush,
# 어?!: 동그란 눈 · o 입 · 머리 위 ?!
'qex':FACE+f'<circle cx="31" cy="42" r="6" fill="#fff" stroke="{B}" stroke-width="3"/><circle cx="31" cy="43" r="2.6" fill="{B}"/><circle cx="57" cy="42" r="6" fill="#fff" stroke="{B}" stroke-width="3"/><circle cx="57" cy="43" r="2.6" fill="{B}"/><ellipse cx="44" cy="58" rx="4" ry="5" fill="#c4553f" stroke="{B}" stroke-width="2.8"/>'+S('<path d="M64 10 C64 0 82 -1 82 9 C82 15 76 16 76 21 H70 C70 14 76 13 76 10 C76 6 70 6 70 10Z"/><circle cx="73" cy="28" r="3.8"/>','gp')+S('<path d="M88 -1 H95 L93 20 H90Z"/><circle cx="91.5" cy="28" r="3.8"/>','gy'),
# 반짝: 빛나는 눈 · 활짝 · 주변 반짝이
'spark':FACE+f'<circle cx="31" cy="43" r="6.5" fill="{B}"/><circle cx="57" cy="43" r="6.5" fill="{B}"/><circle cx="33" cy="40.5" r="2.4" fill="#fff"/><circle cx="59" cy="40.5" r="2.4" fill="#fff"/><circle cx="29" cy="46" r="1.2" fill="#fff"/><circle cx="55" cy="46" r="1.2" fill="#fff"/>'+L('M36 55 q8 8 16 0')+blush+S(star(84,14,10)+star(90,40,5.5),'gy'),
}
NAME={'win':'해냈다!','sweat':'식은땀','note':'신남','heart':'고마워','anger':'욱','smile':'헤헤','qex':'어?!','spark':'반짝'}
def Fc(k,s=60): return f'<svg width="{s}" height="{s*0.85:.0f}" viewBox="4 -6 98 84" xmlns="http://www.w3.org/2000/svg">{DEF}{I[k]}</svg>'
if __name__=='__main__':
    sheet=''.join(f'<div class="c"><div class="r">{Fc(k,96)}</div><b>{NAME[k]}</b></div>' for k in I)
    open('emo4_sheet.html','w').write(f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;padding:20px;background:#c99a62;font:700 15px "Noto Sans KR",sans-serif;color:#3b2a1e}}.g{{display:grid;grid-template-columns:repeat(4,150px);gap:10px}}.c{{background:#e9c99a;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 0 8px}}.r{{filter:drop-shadow(0 3px 2px rgba(40,22,8,.35))}}</style><div class="g">{sheet}</div>')
    CH=[(885,428,392,'win','「늑대 무리 토벌」, 해냈어!'),(933,527,493,'smile',None),(1170,565,531,'sweat',None)]
    h=''
    for xr,yc,top,k,txt in CH:
        h+=f'<div class="emo" style="left:{xr+2}px;top:{yc-44}px">{Fc(k,62)}</div>'
        if txt: h+=f'<div class="bub" style="left:{825-34}px;top:{top-8-76}px">{txt}<i></i></div>'
    css=open('emo_A.html').read().split('<style>')[1].split('</style>')[0].replace('transform:translateX(-50%);','')
    open('emo4_lobby.html','w').write(f'<!doctype html><meta charset="utf-8"><style>{css}</style><div class="st">{h}</div>')
