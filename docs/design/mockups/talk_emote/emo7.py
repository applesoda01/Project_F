import math
K='#2a1a0e'
def sh(shape,base,dark,lw=2.2,rim=4,extra=''):  # 셀 음영: 흰 테두리 → 바탕색 + 아래쪽 어두운 면(클립) → 진한 선
    import random;cid='c'+str(abs(hash(shape))%10**8)
    return (f'<defs><clipPath id="{cid}">{shape}</clipPath></defs><g stroke-linejoin="miter" stroke-linecap="round">'
      f'<g fill="#fff" stroke="#fff" stroke-width="{rim*2+lw}">{shape}</g><g fill="{base}">{shape}</g>'
      f'<g clip-path="url(#{cid})"><rect x="-50" y="0" width="300" height="300" fill="{dark}" transform="translate(0 0)" class="shd"/></g>'
      f'<g fill="none" stroke="{K}" stroke-width="{lw}">{shape}</g>{extra}</g>')
def cel(shape,base,dark,cut,lw=2.2,rim=4,extra=''):
    return sh(shape,base,dark,lw,rim,extra).replace('y="0" width="300" height="300"',f'y="{cut}" width="300" height="300"')
def star4(x,y,r,t=.16): return f'<path d="M{x} {y-r} L{x+r*t} {y-r*t} L{x+r} {y} L{x+r*t} {y+r*t} L{x} {y+r} L{x-r*t} {y+r*t} L{x-r} {y} L{x-r*t} {y-r*t}Z"/>'
def lines(cx,cy,r1,r2,angs,w=2.6,c=K): return ''.join(f'<line x1="{cx+r1*math.cos(math.radians(a)):.1f}" y1="{cy+r1*math.sin(math.radians(a)):.1f}" x2="{cx+r2*math.cos(math.radians(a)):.1f}" y2="{cy+r2*math.sin(math.radians(a)):.1f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>' for a in angs)
M={  # ① 만화 기호형
'win':cel('<path d="M27 6 L41 6 L35 38 L25 38Z"/><path d="M23 44 L33 44 L31 54 L21 54Z"/>','#ffd23f','#f0a020',30)+lines(32,30,30,40,[200,235,305,340]),
'sweat':cel('<path d="M30 6 C24 18 14 28 14 38 a16 16 0 0 0 32 0 C46 28 36 18 30 6Z"/>','#8fd3ff','#3d93d8',34,extra='<path d="M21 34 q-1 6 3 10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')+cel('<path d="M50 22 C47 28 43 32 43 36 a7 7 0 0 0 14 0 C57 32 53 28 50 22Z"/>','#8fd3ff','#3d93d8',36,lw=1.8,rim=3),
'note':cel('<path d="M18 46 L18 14 L48 6 L48 38 L43 38 L43 15 L23 20 L23 46Z"/><ellipse cx="13" cy="46" rx="8" ry="6" transform="rotate(-25 13 46)"/><ellipse cx="38" cy="39" rx="8" ry="6" transform="rotate(-25 38 39)"/>','#ff9d5c','#d9622a',40)+lines(52,12,4,10,[-40,0,40],2.2),
'heart':cel('<path d="M32 54 L10 32 C2 22 8 8 20 8 C26 8 30 12 32 16 C34 12 38 8 44 8 C56 8 62 22 54 32Z"/>','#ff5f78','#cf2c4a',34,extra='<path d="M15 20 q2 -6 8 -7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>'),
'anger':cel('<path d="M24 6 L30 6 C30 20 24 26 8 26 L8 20 C20 20 24 16 24 6Z"/><path d="M40 6 L34 6 C34 20 40 26 56 26 L56 20 C44 20 40 16 40 6Z"/><path d="M24 58 L30 58 C30 44 24 38 8 38 L8 44 C20 44 24 48 24 58Z"/><path d="M40 58 L34 58 C34 44 40 38 56 38 L56 44 C44 44 40 48 40 58Z"/>','#ff4a3a','#b81e1e',32),
'smile':cel(''.join(f'<ellipse cx="{32+13*math.cos(math.radians(a)):.1f}" cy="{32+13*math.sin(math.radians(a)):.1f}" rx="9" ry="9"/>' for a in range(-90,270,72)),'#ffb3cf','#ef7fa8',38,extra='<circle cx="32" cy="32" r="7" fill="#ffe27a" stroke="'+K+'" stroke-width="2"/>'),
'qex':cel('<path d="M6 18 C6 4 30 2 30 16 C30 25 21 26 21 34 L13 34 C13 23 22 22 22 17 C22 12 14 12 13 18Z"/><path d="M12 40 L21 40 L21 49 L12 49Z"/>','#a9b4ff','#5b68d8',30)+cel('<path d="M38 4 L50 4 L46 36 L40 36Z"/><path d="M39 41 L48 41 L47 50 L38 50Z"/>','#ffd23f','#f0a020',28),
'spark':cel(star4(26,30,22),'#ffe066','#f0b42a',32)+cel(star4(50,12,10),'#fff2a6','#f0c040',14,lw=1.8,rim=3)+cel(star4(52,46,6),'#fff2a6','#f0c040',47,lw=1.6,rim=3),
}
def manga(k,s=64): return f'<svg width="{s}" height="{s}" viewBox="-4 -4 72 72" xmlns="http://www.w3.org/2000/svg">{M[k]}</svg>'
# ② 도트형: 22x18 칸에 직접 찍음
def dot(k,sc=4):
    W,H=24,20;g=[[None]*W for _ in range(H)]
    O,F,S,R,P_,Y,BL,OR,PU='#2a1a0e','#fbf5ea','#e3d3b8','#d8342c','#f08aa0','#ffd23f','#5fb4ee','#ff9d5c','#8f9cf5'
    def put(x,y,c):
        if 0<=x<W and 0<=y<H: g[y][x]=c
    # 얼굴 (가로 16 x 세로 12, 아래 2칸 음영)
    cx,cy,rx,ry=9,12,8,6
    for y in range(H):
        for x in range(W):
            d=((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2
            if d<=1: put(x,y,S if y>=cy+3 or (d>.72 and y>cy) else F)
    for y in range(H):
        for x in range(W):
            if g[y][x] and any(not(0<=x+dx<W and 0<=y+dy<H) or g[y+dy][x+dx] is None for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): pass
    edge=[(x,y) for y in range(H) for x in range(W) if g[y][x] and any(not(0<=x+dx<W and 0<=y+dy<H) or g[y+dy][x+dx] is None for dx,dy in((1,0),(-1,0),(0,1),(0,-1)))]
    for x,y in edge: g[y][x]=O
    put(5,9,'#fff');put(6,8,'#fff')  # 광택
    E={'win':[(5,11),(6,10),(7,11),(11,11),(12,10),(13,11),(7,14),(8,15),(9,15),(10,15),(11,14),(8,14,R),(9,14,R),(10,14,R)],
       'sweat':[(5,10),(6,10),(12,10),(13,10),(6,12),(12,12),(7,15),(8,14),(9,15),(10,14),(11,15)],
       'note':[(5,12),(6,11),(7,12),(11,12),(12,11),(13,12),(8,14),(9,15),(10,14),(9,14,R)],
       'heart':[(5,12),(6,13),(7,12),(11,12),(12,13),(13,12),(9,15),(4,14,P_),(14,14,P_)],
       'anger':[(5,10),(6,11),(7,11),(13,10),(12,11),(11,11),(6,12),(12,12),(7,14),(8,14),(9,14),(10,14),(11,14),(7,15),(9,15),(11,15)],
       'smile':[(5,12),(6,11),(7,12),(11,12),(12,11),(13,12),(8,15),(9,15),(10,15),(7,14),(11,14),(4,14,P_),(14,14,P_)],
       'qex':[(6,11),(6,12),(12,11),(12,12),(9,14),(9,15),(8,14),(10,14),(8,15),(10,15)],
       'spark':[(6,11),(6,12),(7,11),(12,11),(12,12),(13,11),(8,15),(9,15),(10,15),(7,14),(11,14),(4,14,P_),(14,14,P_)]}[k]
    for p in E: put(p[0],p[1],p[2] if len(p)>2 else O)
    A={'win':[(18,2,Y),(19,2,Y),(18,3,Y),(19,3,Y),(18,4,Y),(19,4,Y),(18,5,Y),(19,5,Y),(18,7,Y),(19,7,Y)],
       'sweat':[(17,4,BL),(16,5,BL),(17,5,BL),(18,5,BL),(16,6,BL),(17,6,'#fff'),(18,6,BL),(17,7,BL)],
       'note':[(19,1,OR),(20,1,OR),(21,2,OR),(19,2,OR),(19,3,OR),(19,4,OR),(18,5,OR),(17,5,OR),(17,6,OR),(18,6,OR)],
       'heart':[(16,3,R),(17,2,R),(18,3,R),(19,2,R),(20,3,R),(16,4,R),(17,4,R),(18,4,R),(19,4,R),(20,4,R),(17,5,R),(18,5,R),(19,5,R),(18,6,R),(17,3,'#fff')],
       'anger':[(16,2,R),(16,3,R),(17,3,R),(20,2,R),(20,3,R),(19,3,R),(16,6,R),(16,5,R),(17,5,R),(20,6,R),(20,5,R),(19,5,R)],
       'smile':[(18,3,P_),(17,4,P_),(19,4,P_),(18,5,P_),(18,4,Y)],
       'qex':[(15,1,PU),(16,0,PU),(17,0,PU),(18,1,PU),(18,2,PU),(17,3,PU),(17,4,PU),(17,6,PU),(20,0,Y),(20,1,Y),(20,2,Y),(20,3,Y),(20,4,Y),(20,6,Y)],
       'spark':[(18,0,Y),(18,1,Y),(16,2,Y),(17,2,Y),(18,2,'#fff'),(19,2,Y),(20,2,Y),(18,3,Y),(18,4,Y),(21,6,Y),(20,7,Y),(21,7,Y),(22,7,Y),(21,8,Y)]}[k]
    for x,y,c in A: put(x,y,c)
    # 기호에 진한 테두리
    for x,y,c in A:
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            if 0<=x+dx<W and 0<=y+dy<H and g[y+dy][x+dx] is None: g[y+dy][x+dx]=O
    r=''.join(f'<rect x="{x}" y="{y}" width="1.02" height="1.02" fill="{g[y][x]}"/>' for y in range(H) for x in range(W) if g[y][x])
    return f'<svg width="{W*sc}" height="{H*sc}" viewBox="0 0 {W} {H}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">{r}</svg>'
# ③ 얼굴형 다듬기: 작게 · 볼터치 없음 · 진한 가는 선 · 차분한 면
o5={};exec(open('emo5.py').read().split("if __name__")[0],o5)
def tidy(k,s=64):
    ft,acc=o5['P'][k]; import re
    face='<path d="M14 46 C13 28 26 18 44 18 C62 18 75 28 74 46 C73 60 62 68 44 68 C26 68 15 60 14 46Z" fill="#f6efe2" stroke="#2a1a0e" stroke-width="2"/><path d="M18 50 C22 60 32 66 44 66 C56 66 66 60 70 50 C66 56 56 60 44 60 C32 60 22 56 18 50Z" fill="#e2d4bc"/>'
    ft=re.sub(r'<ellipse cx="\d+" cy="5[12]"[^>]*/>','',ft)
    body=(face+ft+''.join(acc)).replace('#5a3519','#2a1a0e').replace('stroke-width="3.4"','stroke-width="2.4"').replace('stroke-width="3"','stroke-width="2"').replace('stroke-width="8"','stroke-width="5"').replace('stroke-width="2.6"','stroke-width="1.8"')
    return f'<svg width="{s}" height="{s*0.85:.0f}" viewBox="4 -8 100 86" xmlns="http://www.w3.org/2000/svg">{o5["DEF"]}{body}</svg>'
NAME=o5['NAME'];KS=list(M)
if __name__=='__main__':
    cells=''.join(f'<div class="c"><div class="r">{manga(k,70)}</div><div class="r">{dot(k,3)}</div><div class="r">{tidy(k,70)}</div><b>{NAME[k]}</b></div>' for k in KS)
    open('emo7.html','w').write(f'''<!doctype html><meta charset="utf-8"><style>body{{margin:0;padding:16px;background:#c99a62;font:700 14px "Noto Sans KR",sans-serif;color:#3b2a1e;width:940px}}
.g{{display:grid;grid-template-columns:110px repeat(8,96px);gap:6px}}.h{{display:flex;flex-direction:column;padding-top:8px;font-size:13px}}.h div{{height:84px;display:flex;align-items:center}}
.c{{background:#e9c99a;border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:8px 0 6px}}.r{{height:84px;display:grid;place-items:center;filter:drop-shadow(0 2px 2px rgba(40,22,8,.3))}}</style>
<div class="g"><div class="h"><div>① 만화 기호형</div><div>② 도트형</div><div>③ 얼굴형 다듬기</div></div>{cells}</div>''')
    CH=[(885,428,392,'win','「늑대 무리 토벌」, 해냈어!'),(933,527,493,'anger',None),(1170,565,531,'sweat',None)]
    css=open('emo_A.html').read().split('<style>')[1].split('</style>')[0].replace('transform:translateX(-50%);','')
    for n,fn,sz,dy in [('1',lambda k:manga(k,46),46,40),('2',lambda k:dot(k,2),40,36),('3',lambda k:tidy(k,50),50,38)]:
        h=''
        for xr,yc,top,k,txt in CH:
            h+=f'<div class="emo" style="left:{xr+2}px;top:{yc-dy}px">{fn(k)}</div>'
            if txt: h+=f'<div class="bub" style="left:{825-34}px;top:{top-8-76}px">{txt}<i></i></div>'
        open(f'emo7_l{n}.html','w').write(f'<!doctype html><meta charset="utf-8"><style>{css}</style><div class="st">{h}</div>')
