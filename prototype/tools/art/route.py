# 지역 순환 길 만들기: 마을 → 풀밭 → 숲 → 사막 → (마을). 윗줄 1 + 아랫줄 4.
from PIL import Image; import random, sys
D='/tmp/claude-0/w/regions/'
L=lambda k: Image.open(D+k+'.png').convert('RGBA')
REG={ # 윗줄 후보, 아랫줄 후보(가중치)
 'town':  (['town_a','town_b','town_c'], {'dirt_a':2,'dirt_b':1,'dirt_c':3,'dirt_d':2,'dirt_e':3}),
 'grass': (['grass_a','grass_b','grass_c'], {'dirt_a':2,'dirt_b':1,'dirt_c':3,'dirt_d':2,'dirt_e':3}),
 'forest':(['forest_a','forest_a','forest_b'], {'fdirt_a':1,'fdirt_b':1}),
 'desert':(['sand_a','sand_b'], {'sand_c':3,'sandstone':1}),
}
TR={('town','grass'):('town_to_grass',None),('grass','forest'):('grass_to_forest','dirt_to_fdirt'),
    ('forest','desert'):('forest_to_sand','fdirt_to_sand'),('desert','town'):('sand_to_town','sand_to_dirt')}
def route(order,lens,seed=3):
    r=random.Random(seed); cols=[]
    for n,(reg,ln) in enumerate(zip(order,lens)):
        top,low=REG[reg]; prev=None
        for i in range(ln):
            t=r.choice([x for x in top if x!=prev] or top); prev=t
            col=[t]
            for j in range(4):
                ban={cols[-1][j+1] if cols else None, col[-1]}
                while True:
                    k=r.choices(list(low),weights=list(low.values()))[0]
                    if k not in ban or len(low)<3: break
                col.append(k)
            cols.append(col)
        nxt=order[(n+1)%len(order)]; tt,tl=TR[(reg,nxt)]
        nl=REG[nxt][1]
        cols.append([tt]+[tl if tl else r.choices(list(nl),weights=list(nl.values()))[0] for _ in range(4)])
    return cols
def render(cols,sky=(142,201,240)):
    W=len(cols)*32; H=12+32*5; im=Image.new('RGBA',(W,H),sky+(255,)); cache={}
    for i,col in enumerate(cols):
        for j in range(1,5):
            k=col[j]; cache.setdefault(k,L(k)); im.alpha_composite(cache[k],(i*32,12+32*j))
        k=col[0]; cache.setdefault(k,L(k)); im.alpha_composite(cache[k],(i*32,0))
    return im
if __name__=='__main__':
    cols=route(['town','grass','forest','desert'],[10,12,12,12])
    im=render(cols); im.save(D+'route_native.png'); print(im.size,len(cols))
