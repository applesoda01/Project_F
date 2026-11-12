# 32x32 도트 블록: 흙(2종) + 풀 블록(2종). 상하좌우 반복 이음.
from PIL import Image
import random
B=32
P={ # 배경 팔레트 (14색)
 'd0':(92,58,40),'d1':(122,80,52),'d2':(146,98,62),'d3':(170,118,76),
 's0':(96,92,90),'s1':(140,136,130),'s2':(182,178,170),
 'g0':(46,96,48),'g1':(70,132,58),'g2':(98,166,70),'g3':(140,198,92),
 'r0':(110,72,48),
}
def C(k): return P[k]+(255,)
def dirt(seed,stones=2):
    r=random.Random(seed); im=Image.new('RGBA',(B,B),C('d2')); px=im.load()
    # 큰 얼룩(어두운/밝은 덩어리) - 랩어라운드
    for _ in range(9):
        cx,cy=r.randrange(B),r.randrange(B); w,h=r.randint(3,6),r.randint(2,3); k=r.choice(['d1','d1','d3'])
        for y in range(h):
            for x in range(w):
                if (x in(0,w-1)) and (y in(0,h-1)): continue
                px[(cx+x)%B,(cy+y)%B]=C(k)
    # 잔점
    for _ in range(26):
        x,y=r.randrange(B),r.randrange(B); px[x,y]=C(r.choice(['d0','d1','d3']))
    # 돌멩이
    for _ in range(stones):
        cx,cy=r.randrange(B),r.randrange(B); w=r.randint(3,5); h=r.randint(2,3)
        for y in range(-1,h+1):
            for x in range(-1,w+1):
                inside=0<=x<w and 0<=y<h
                corner=(x in(-1,w)) and (y in(-1,h))
                if corner: continue
                k='s0' if not inside else ('s2' if y==0 and x<w-1 else 's1')
                if not inside and y==-1: k='d0'
                px[(cx+x)%B,(cy+y)%B]=C(k)
    return im
def grass(seed):
    r=random.Random(seed); im=dirt(seed+100,stones=1); px=im.load()
    top=6  # 풀 지면선(캐릭터 발이 닿는 줄)
    for x in range(B):
        for y in range(top): px[x,y]=(0,0,0,0)
    # 풀 덮개: 지면선부터 4~7줄, 아래 경계는 들쭉날쭉
    depth=[0]*B; d=5
    for x in range(B):
        d=max(3,min(8,d+r.choice([-1,0,0,1]))); depth[x]=d
    depth[-1]=depth[0]  # 이음
    for x in range(B):
        for y in range(top,top+depth[x]):
            k='g2' if y<top+2 else 'g1'
            if y==top: k='g3'
            px[x,y]=C(k)
        px[x,top+depth[x]]=C('g0')            # 풀 아래 그림자 선
        if r.random()<0.35: px[x,top+depth[x]+1]=C('d1')
    # 풀잎: 지면선 위로 1~5칸
    x=r.randrange(3)
    while x<B:
        h=r.choice([2,3,3,4,5]); lean=r.choice([-1,0,0,1])
        for i in range(1,h+1):
            xx=(x+(lean if i>h//2 else 0))%B
            px[xx,top-i]=C('g1' if i<h else 'g3')
        x+=r.randint(2,4)
    return im
out={'dirt_a':dirt(1),'dirt_b':dirt(7,3),'grass_a':grass(3),'grass_b':grass(11)}
for k,v in out.items(): v.save(f'/tmp/claude-0/w/blocks/{k}.png')
print('palette',len(P))
