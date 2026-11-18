exec(open('emo4.py').read().split("I={")[0])
# 층: (표정, [기호들]) — 얼굴은 공통 FACE
P={
'win':(S(star(30,40,7)+star(58,40,7),'gy')+f'<path d="M30 52 Q44 66 58 52Z" fill="#c4553f" stroke="{B}" stroke-width="3" stroke-linejoin="round"/>',[S('<rect x="80" y="2" width="9" height="24" rx="4.5"/><circle cx="84.5" cy="34" r="5"/>','gy')]),
'sweat':(L('M23 38 L34 33 M65 38 L54 33')+f'<circle cx="31" cy="45" r="3.6" fill="{B}"/><circle cx="57" cy="45" r="3.6" fill="{B}"/>'+L('M34 58 q3.3 -4 6.6 0 q3.3 4 6.6 0 q3.3 -4 6.6 0'),[S('<path d="M76 10 C72 18 66 24 66 30 a10 10 0 0 0 20 0 C86 24 80 18 76 10Z"/>','gb')]),
'note':(L('M24 44 q6 -8 12 0 M52 44 q6 -8 12 0')+f'<path d="M34 52 Q44 64 54 52Z" fill="#c4553f" stroke="{B}" stroke-width="3" stroke-linejoin="round"/>'+blush,[S('<path d="M80 30 V4 L94 1 V10 L84 12 V30Z"/><ellipse cx="76" cy="31" rx="7" ry="5.5" transform="rotate(-20 76 31)"/>','go')]),
'heart':(L('M24 44 q6 6 12 0 M52 44 q6 6 12 0')+L('M40 56 q4 4 8 0')+blush+blush.replace('opacity=".65"','opacity=".35"'),[S('<path d="M82 36 C68 27 64 18 69 12 C74 6 80 8 82 14 C84 8 90 6 95 12 C100 18 96 27 82 36Z"/>','gr')]),
'anger':(L('M24 34 L36 40 M64 34 L52 40',4)+f'<circle cx="31" cy="45" r="3.4" fill="{B}"/><circle cx="57" cy="45" r="3.4" fill="{B}"/><rect x="33" y="53" width="22" height="9" rx="3" fill="#fff" stroke="{B}" stroke-width="2.8"/>'+L('M40.3 53 V62 M47.6 53 V62',2.2),[S('<path d="M70 4 L74 4 Q74 15 63 15 L63 11 Q70 11 70 4Z"/><path d="M80 4 L76 4 Q76 15 87 15 L87 11 Q80 11 80 4Z"/><path d="M70 28 L74 28 Q74 17 63 17 L63 21 Q70 21 70 28Z"/><path d="M80 28 L76 28 Q76 17 87 17 L87 21 Q80 21 80 28Z"/>','gx')]),
'smile':(L('M24 45 q6 -8 12 0 M52 45 q6 -8 12 0')+L('M36 54 q8 7 16 0')+blush,[]),
'qex':(f'<circle cx="31" cy="42" r="6" fill="#fff" stroke="{B}" stroke-width="3"/><circle cx="31" cy="43" r="2.6" fill="{B}"/><circle cx="57" cy="42" r="6" fill="#fff" stroke="{B}" stroke-width="3"/><circle cx="57" cy="43" r="2.6" fill="{B}"/><ellipse cx="44" cy="58" rx="4" ry="5" fill="#c4553f" stroke="{B}" stroke-width="2.8"/>',[S('<path d="M64 10 C64 0 82 -1 82 9 C82 15 76 16 76 21 H70 C70 14 76 13 76 10 C76 6 70 6 70 10Z"/><circle cx="73" cy="28" r="3.8"/>','gp'),S('<path d="M88 -1 H95 L93 20 H90Z"/><circle cx="91.5" cy="28" r="3.8"/>','gy')]),
'spark':(f'<circle cx="31" cy="43" r="6.5" fill="{B}"/><circle cx="57" cy="43" r="6.5" fill="{B}"/><circle cx="33" cy="40.5" r="2.4" fill="#fff"/><circle cx="59" cy="40.5" r="2.4" fill="#fff"/>'+L('M36 55 q8 8 16 0')+blush,[S(star(84,14,10),'gy'),S(star(90,40,5.5),'gy')]),
}
NAME={'win':'해냈다!','sweat':'식은땀','note':'신남','heart':'고마워','anger':'욱','smile':'헤헤','qex':'어?!','spark':'반짝'}
MOVE={'win':'얼굴 통통 · ! 깡충','sweat':'얼굴 덜덜 · 땀 주르륵','note':'얼굴 갸웃갸웃 · 음표 둥실','heart':'하트 두근두근 · 볼 발그레','anger':'얼굴 부들 · 핏대 펄떡','smile':'얼굴 말랑 눌렸다 폄','qex':'? 다음 ! 차례로 톡','spark':'별 번갈아 반짝'}
CSS='''
.em{transform-box:fill-box;transform-origin:50% 100%;animation:life 2.6s infinite}
@keyframes life{0%{transform:scale(0);opacity:0}7%{transform:scale(1.18);opacity:1}12%{transform:scale(.94)}16%{transform:scale(1)}86%{transform:scale(1);opacity:1}100%{transform:scale(.55) translateY(-6px);opacity:0}}
g{transform-box:fill-box;transform-origin:50% 50%}
.win .fc{animation:hop .52s infinite ease-in-out}.win .a0{animation:jump .52s infinite}
@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes tw{0%,100%{transform:scale(1)}50%{transform:scale(1.25) rotate(20deg)}}
@keyframes jump{0%,100%{transform:translateY(0) rotate(0)}40%{transform:translateY(-9px) rotate(8deg)}}
.sweat .fc{animation:shiv .14s infinite}.sweat .a0{animation:drip 1.1s infinite ease-in}
@keyframes shiv{0%,100%{transform:translateX(0)}50%{transform:translateX(1.2px)}}@keyframes drip{0%{transform:translateY(-4px);opacity:0}15%{opacity:1}70%{transform:translateY(12px);opacity:1}100%{transform:translateY(18px);opacity:0}}
.note .fc{transform-origin:50% 100%;animation:rock .8s infinite ease-in-out}.note .a0{animation:float 1.3s infinite ease-out}
@keyframes rock{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}@keyframes float{0%{transform:translate(-6px,10px) rotate(-10deg) scale(.7);opacity:0}25%{opacity:1}100%{transform:translate(6px,-12px) rotate(12deg) scale(1.05);opacity:0}}
.heart .a0{animation:beat .9s infinite}.heart .ft ellipse{animation:blush .9s infinite}
@keyframes beat{0%,100%{transform:scale(1)}14%{transform:scale(1.28)}28%{transform:scale(1)}42%{transform:scale(1.2)}60%{transform:scale(1)}}@keyframes blush{0%,100%{opacity:.5}20%{opacity:.95}}
.anger .fc{animation:shake .2s infinite}.anger .a0{animation:throb .4s infinite}
@keyframes shake{0%,100%{transform:translateX(-1.5px)}50%{transform:translateX(1.5px)}}@keyframes throb{0%,100%{transform:scale(.82)}50%{transform:scale(1.22)}}
.smile .fc{transform-origin:50% 100%;animation:squish .7s infinite ease-in-out}
@keyframes squish{0%,100%{transform:scale(1,1)}50%{transform:scale(1.1,.88)}}
.qex .a0{animation:pop1 2.6s infinite}.qex .a1{animation:pop2 2.6s infinite}.qex .fc{animation:hop2 2.6s infinite}
@keyframes pop1{0%,14%{transform:scale(0)}20%{transform:scale(1.3)}25%,100%{transform:scale(1)}}@keyframes pop2{0%,26%{transform:scale(0)}32%{transform:scale(1.35)}37%,100%{transform:scale(1)}}
@keyframes hop2{0%,14%{transform:translateY(0)}20%{transform:translateY(-5px)}26%{transform:translateY(0)}32%{transform:translateY(-4px)}38%,100%{transform:translateY(0)}}
.spark .a0{animation:tw2 .8s infinite}.spark .a1{animation:tw2 .8s infinite .4s}.spark .fc{animation:hop .8s infinite}
@keyframes tw2{0%,100%{transform:scale(.5) rotate(0);opacity:.6}50%{transform:scale(1.15) rotate(45deg);opacity:1}}
'''
def A5(k,s=96):
    ft,acc=P[k]
    a=''.join(f'<g class="a{i}">{x}</g>' for i,x in enumerate(acc))
    return f'<svg class="{k}" width="{s}" height="{s*0.85:.0f}" viewBox="4 -8 100 86" style="overflow:visible">{DEF}<g class="em"><g class="fc">{FACE}<g class="ft">{ft}</g></g>{a}</g></svg>'
if __name__=='__main__':
    sheet=''.join(f'<div class="c"><div class="r">{A5(k)}</div><b>{NAME[k]}</b><small>{MOVE[k]}</small></div>' for k in P)
    open('emo5.html','w').write(f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;padding:16px;background:#c99a62;font:700 15px "Noto Sans KR",sans-serif;color:#3b2a1e;width:668px}}.g{{display:grid;grid-template-columns:repeat(4,160px);gap:8px}}.c{{background:#e9c99a;border-radius:12px;display:flex;flex-direction:column;align-items:center;padding:18px 0 8px}}.c small{{font-size:11.5px;color:#7a5a3a;font-weight:500}}.r{{height:96px;display:grid;place-items:end center;filter:drop-shadow(0 3px 2px rgba(40,22,8,.35))}}{CSS}</style><div class="g">{sheet}</div>')
