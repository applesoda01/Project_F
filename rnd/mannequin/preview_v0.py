import json
from PIL import Image,ImageDraw,ImageFont
S=json.load(open('rnd/mannequin/mannequin_v0.json',encoding='utf-8'))
J=S['joints'];root=(0,2.8);body=(11.0,160.9)
def ab(name):
    if name=='body':return body
    j=J[name];p=ab(j['parent']) if j['parent']!='root' and j['parent'] in J else (body if j['parent']=='body' else root)
    if 'dx' in j:return (p[0]+j['dx'],p[1]+j['dy'])
    return p
pos={k:ab(k) for k in J};pos['body']=body
# 부위 박스(중심x,중심y,폭,높이) — 관절 간 거리 기반 추정(단위)
B={
 'tail':(pos['tail'][0]+45,pos['tail'][1]+5,70,28),
 'hairB':(pos['head'][0]+2,pos['head'][1]+60,125,100),
 'headB':(pos['head'][0]+5,pos['head'][1]+58,112,98),
 'armB':(pos['armB'][0]+4,pos['armB'][1]-30,28,66),
 'handB':(pos['armB'][0]+25,pos['armB'][1]-47,38,38),
 'legB':(pos['legB'][0],pos['legB'][1]-30,26,62),
 'thighB':(pos['thighB'][0]+2,pos['thighB'][1]-30,40,64),
 'legF':(pos['legF'][0],pos['legF'][1]-30,26,62),
 'thighF':(pos['thighF'][0]-4,pos['thighF'][1]-30,40,64),
 'body':(body[0],body[1]+25,70,92),
 'hipF':(body[0],body[1]-12,62,26),
 'skirtF':(body[0]-1,body[1]-24,84,36),
 'head':(pos['head'][0]+8,pos['head'][1]+52,118,102),
 'armF':(pos['armF'][0]+2,pos['armF'][1]-30,28,66),
 'hairSideF':(pos['head'][0]-48,pos['head'][1]+45,26,90),
 'hairF':(pos['head'][0]+8,pos['head'][1]+98,116,34),
 'face':(pos['head'][0]+24,pos['head'][1]+30,56,40),
 'handF':(pos['armF'][0]-25,pos['armF'][1]-46,38,38),
}
order=['tail','hairB','headB','armB','handB','legB','thighB','legF','thighF','body','hipF','skirtF','head','armF','hairSideF','hairF','face','handF']
col={'tail':'#b08968','hairB':'#6c757d','headB':'#8d99ae','armB':'#8ecae6','handB':'#bde0fe','legB':'#74c69d','thighB':'#95d5b2','legF':'#52b788','thighF':'#40916c','body':'#e9c46a','hipF':'#f4a261','skirtF':'#e76f51','head':'#ffd6a5','armF':'#219ebc','hairSideF':'#8d99ae','hairF':'#6c757d','face':'#ffe8d6','handF':'#90e0ef'}
SC=2.6;ox,oy=330,50;W,H=int((330+140)*SC),int((400)*SC)
im=Image.new('RGB',(W,H),'#1b1b1f');d=ImageDraw.Draw(im)
def P(x,y):return (ox+x*SC,H-oy-y*SC)
f=ImageFont.load_default()
# 눈금
for y in range(0,401,50):
    a=P(-140,y);d.line([a,P(150,y)],fill='#2b2b33');d.text((4,a[1]-5),str(y),fill='#777',font=f)
d.line([P(-140,0),P(150,0)],fill='#666',width=2)
for n in order:
    cx,cy,w,h=B[n];a=P(cx-w/2,cy+h/2);b=P(cx+w/2,cy-h/2)
    d.rectangle([a,b],fill=col[n],outline='#111')
for k,(x,y) in pos.items():
    p=P(x,y);d.ellipse([p[0]-4,p[1]-4,p[0]+4,p[1]+4],fill='#ff2d55',outline='white');d.text((p[0]+6,p[1]-12),k,fill='white',font=f)
# 비율 지표
top=B['hairF'][1]+B['hairF'][3]/2;bot=B['legF'][1]-B['legF'][3]/2
head_h=(B['head'][1]+B['head'][3]/2)-(pos['head'][1]-4)
d.text((10,8),f'mannequin v0 (rough boxes, units)  total_h~{top-bot:.0f}  head_h~{head_h:.0f}  heads~{(top-bot)/head_h:.1f}',fill='white',font=f)
im.save('rnd/mannequin/mannequin_v0_preview.png');print(W,H,round(top-bot),round(head_h),round((top-bot)/head_h,2))
print({k:(round(v[0],1),round(v[1],1)) for k,v in pos.items()})
