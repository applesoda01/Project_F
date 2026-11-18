import re
m7={};exec(open('emo7.py').read().split("\nif __name__=='__main__':")[0],m7)
K=m7['K'];cel=m7['cel'];lines=m7['lines'];M=m7['M'];P=m7['o5']['P'];NAME=m7['NAME']
FACE=cel('<path d="M8 40 C7 22 20 12 38 12 C56 12 69 22 68 40 C67 55 55 63 38 63 C21 63 9 55 8 40Z"/>','#fbf4e6','#e8d7ba',47,lw=2.4,rim=3.5,extra='<path d="M17 25 C21 19 27 16 34 16" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>')
hatch=lambda x,y:''.join(f'<line x1="{x+i*3.2}" y1="{y+2.5}" x2="{x+i*3.2+2}" y2="{y-1.5}" stroke="#e0716a" stroke-width="1.5" stroke-linecap="round"/>' for i in range(3))
# 표정 (얼굴 좌표계 0~76): 애니메이션식 눈 · 볼터치 대신 빗금
L=lambda d,w=2.4:f'<path d="{d}" fill="none" stroke="{K}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
F={
'win':L('M19 35 L27 39 L19 43')+L('M57 35 L49 39 L57 43')+f'<path d="M28 47 Q38 59 48 47Z" fill="#9c3a2a" stroke="{K}" stroke-width="2" stroke-linejoin="round"/>',   # >  <  활짝
'sweat':L('M18 32 L28 29 M58 32 L48 29')+f'<circle cx="24" cy="39" r="2.6" fill="{K}"/><circle cx="52" cy="39" r="2.6" fill="{K}"/>'+L('M29 51 q3 -3 6 0 q3 3 6 0 q3 -3 6 0',2),
'note':L('M18 40 q5 -7 10 0 M48 40 q5 -7 10 0')+f'<path d="M31 47 Q38 56 45 47Z" fill="#9c3a2a" stroke="{K}" stroke-width="2" stroke-linejoin="round"/>'+hatch(14,49)+hatch(55,49),
'heart':L('M18 40 q5 5 10 0 M48 40 q5 5 10 0')+L('M35 50 q3 3 6 0',2)+hatch(14,48)+hatch(55,48),
'anger':L('M17 31 L29 37 M59 31 L47 37',2.8)+f'<circle cx="25" cy="41" r="2.5" fill="{K}"/><circle cx="51" cy="41" r="2.5" fill="{K}"/><rect x="29" y="47" width="18" height="7" rx="2" fill="#fff" stroke="{K}" stroke-width="2"/>'+L('M35 47 V54 M41 47 V54',1.4),
'smile':L('M18 40 q5 -7 10 0 M48 40 q5 -7 10 0')+L('M32 48 q6 5 12 0')+hatch(14,47)+hatch(55,47),
'qex':f'<circle cx="25" cy="38" r="4.6" fill="#fff" stroke="{K}" stroke-width="2"/><circle cx="25" cy="38.5" r="1.8" fill="{K}"/><circle cx="51" cy="38" r="4.6" fill="#fff" stroke="{K}" stroke-width="2"/><circle cx="51" cy="38.5" r="1.8" fill="{K}"/><ellipse cx="38" cy="51" rx="3" ry="3.8" fill="#9c3a2a" stroke="{K}" stroke-width="2"/>',
'spark':f'<circle cx="25" cy="39" r="4.4" fill="{K}"/><circle cx="51" cy="39" r="4.4" fill="{K}"/><circle cx="26.6" cy="37.2" r="1.7" fill="#fff"/><circle cx="52.6" cy="37.2" r="1.7" fill="#fff"/>'+L('M32 48 q6 6 12 0')+hatch(14,47)+hatch(55,47),
}
POS={'win':(54,-20,.75),'sweat':(56,-12,.62),'note':(52,-20,.68),'heart':(54,-16,.68),'anger':(52,-18,.62),'smile':(54,-16,.6),'qex':(48,-22,.75),'spark':(50,-22,.74)}
def blend(k,s=80):
    x,y,sc=POS[k];sym=f'<g transform="translate({x} {y}) scale({sc})">{M[k]}</g>'
    return f'<svg width="{s}" height="{s*0.885:.0f}" viewBox="2 -24 104 92" xmlns="http://www.w3.org/2000/svg">{FACE}{F[k]}{sym}</svg>'
if __name__=='__main__':
    cells=''.join(f'<div class="c"><div class="r">{blend(k,92)}</div><b>{NAME[k]}</b></div>' for k in M)
    open('emo8.html','w').write(f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;padding:16px;background:#c99a62;font:700 14px "Noto Sans KR",sans-serif;color:#3b2a1e;width:700px}}.g{{display:grid;grid-template-columns:repeat(4,160px);gap:8px}}.c{{background:#e9c99a;border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:12px 0 8px}}.r{{height:84px;display:grid;place-items:center;filter:drop-shadow(0 2px 2px rgba(40,22,8,.3))}}</style><div class="g">{cells}</div>')
    CH=[(885,428,392,'win','「늑대 무리 토벌」, 해냈어!'),(933,527,493,'anger',None),(1170,565,531,'sweat',None)]
    css=open('emo_A.html').read().split('<style>')[1].split('</style>')[0].replace('transform:translateX(-50%);','')
    h=''
    for xr,yc,top,k,txt in CH:
        h+=f'<div class="emo" style="left:{xr}px;top:{yc-44}px">{blend(k,62)}</div>'
        if txt: h+=f'<div class="bub" style="left:{825-34}px;top:{top-8-76}px">{txt}<i></i></div>'
    open('emo8_l.html','w').write(f'<!doctype html><meta charset="utf-8"><style>{css}</style><div class="st">{h}</div>')
