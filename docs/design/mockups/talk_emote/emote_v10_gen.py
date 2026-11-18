import base64
from PIL import Image
u=lambda n:'data:image/png;base64,'+base64.b64encode(open(f'gp2/{n}.png','rb').read()).decode()
sz=lambda n:Image.open(f'gp2/{n}.png').size
FW,FH=sz('face')
CSS='''
.em{position:absolute;transform-origin:4% 96%;animation:life 2.6s infinite}
@keyframes life{0%{transform:scale(0);opacity:0}7%{transform:scale(1.18);opacity:1}12%{transform:scale(.94)}16%{transform:scale(1)}86%{transform:scale(1);opacity:1}100%{transform:scale(.55) translateY(-6%);opacity:0}}
.fc,.ft,.a0{position:absolute}.fc{left:0;top:0;width:100%;height:100%}.fc>img{position:absolute}
.win .fc{animation:hop .52s infinite ease-in-out}.win .a0{animation:jump .52s infinite}
@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-4%)}}
@keyframes jump{0%,100%{transform:translateY(0) rotate(0)}40%{transform:translateY(-18%) rotate(10deg)}}
.sweat .fc{animation:shiv .14s infinite}.sweat .a0{animation:drip 1.1s infinite ease-in}
@keyframes shiv{0%,100%{transform:translateX(0)}50%{transform:translateX(1.5%)}}@keyframes drip{0%{transform:translateY(-10%);opacity:0}15%{opacity:1}70%{transform:translateY(30%);opacity:1}100%{transform:translateY(45%);opacity:0}}
.note .fc{transform-origin:50% 100%;animation:rock .8s infinite ease-in-out}.note .a0{animation:float 1.3s infinite ease-out}
@keyframes rock{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}@keyframes float{0%{transform:translate(-15%,25%) rotate(-10deg) scale(.7);opacity:0}25%{opacity:1}100%{transform:translate(15%,-30%) rotate(12deg) scale(1.05);opacity:0}}
.heart .a0{animation:beat .9s infinite}
@keyframes beat{0%,100%{transform:scale(1)}14%{transform:scale(1.28)}28%{transform:scale(1)}42%{transform:scale(1.2)}60%{transform:scale(1)}}
.anger .fc{animation:shake .2s infinite}.anger .a0{animation:throb .4s infinite}
@keyframes shake{0%,100%{transform:translateX(-1.8%)}50%{transform:translateX(1.8%)}}@keyframes throb{0%,100%{transform:scale(.8)}50%{transform:scale(1.22)}}
.smile .fc{transform-origin:50% 100%;animation:squish .7s infinite ease-in-out}.smile .a0{animation:tw2 .7s infinite}
@keyframes squish{0%,100%{transform:scale(1,1)}50%{transform:scale(1.08,.9)}}
.qex .a0{animation:pop1 2.6s infinite}.qex .fc{animation:hop2 2.6s infinite}
@keyframes pop1{0%,14%{transform:scale(0)}21%{transform:scale(1.3)}27%,100%{transform:scale(1)}}
@keyframes hop2{0%,14%{transform:translateY(0)}20%{transform:translateY(-6%)}26%,100%{transform:translateY(0)}}
.spark .a0{animation:tw2 .8s infinite}.spark .fc{animation:hop .8s infinite}
@keyframes tw2{0%,100%{transform:scale(.7) rotate(0)}50%{transform:scale(1.15) rotate(18deg)}}
'''
# 표정 · 기호 위치 (얼굴 크기 대비)
def emo(k,w):
    h=w*FH/FW;ew,eh=sz('e_'+k);sw,sh=sz('s_'+k)
    E=w*.70;Eh=E*eh/ew;ex=w*.55-E/2;ey=h*.47-Eh/2
    S=w*{'win':.24,'sweat':.27,'note':.38,'heart':.38,'anger':.36,'smile':.30,'qex':.44,'spark':.34}[k];Sh=S*sh/sw
    sx=w*.80-S/2;sy=h*.08-Sh/2
    return (f'<div class="em {k}" style="width:{w:.0f}px;height:{h:.0f}px"><div class="fc"><img src="{u("face")}" style="left:0;top:0;width:100%">'
            f'<img class="ft" src="{u("e_"+k)}" style="left:{ex:.1f}px;top:{ey:.1f}px;width:{E:.1f}px"></div>'
            f'<img class="a0" src="{u("s_"+k)}" style="left:{sx:.1f}px;top:{sy:.1f}px;width:{S:.1f}px"></div>')
KS=['win','sweat','note','heart','anger','smile','qex','spark']
NM={'win':'해냈다!','sweat':'식은땀','note':'신남','heart':'고마워','anger':'욱','smile':'헤헤','qex':'어?!','spark':'반짝'}
cells=''.join(f'<div class="c"><div class="slot">{emo(k,104)}</div><b>{NM[k]}</b></div>' for k in KS)
open('gp2_s.html','w').write(f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;padding:16px;background:#7a5230;width:620px;font:700 14px "Noto Sans KR",sans-serif;color:#fbe9c8}}.g{{display:grid;grid-template-columns:repeat(4,146px);gap:8px}}.c{{background:#a7764a;border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:26px 0 6px}}.slot{{position:relative;width:104px;height:96px}}.em{{left:0;bottom:0;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}}{CSS}</style><div class="g">{cells}</div>')
css=open('emo_A.html').read().split('<style>')[1].split('</style>')[0].replace('transform:translateX(-50%);','').replace('.emo{position:absolute;','.emo{position:absolute;width:62px;height:56px;')
h='<div class="bub" style="left:791px;top:308px">「늑대 무리 토벌」, 해냈어!<i></i></div>'
for xr,yc,k in [(885,428,'win'),(933,527,'anger'),(1170,565,'sweat')]:
    h+=f'<div class="emo" style="left:{xr}px;top:{yc-48}px">{emo(k,62)}</div>'
open('gp2_l.html','w').write(f'<!doctype html><meta charset="utf-8"><style>{css}.em{{left:0;top:0;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}}{CSS}</style><div class="st">{h}</div>')
