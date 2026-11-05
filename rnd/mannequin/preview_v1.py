import json
from PIL import Image,ImageDraw,ImageFont
R={ # 설정 자세(setup pose)에서 읽은 월드 사각형 (x0,y0,x1,y1) 단위: 뼈대 좌표
'armB':(12.6,167.3,62.6,235.3),'armF':(-61.4,158.8,-11.4,232.8),'body':(-45.1,119.1,66.9,261.0),
'face':(-35.3,245.1,70.7,327.1),'hairB':(-101.5,229.2,74.5,401.1),'hairF':(-95.4,217.1,104.6,386.9),
'handB':(30.6,95.0,108.6,195.0),'handF':(-113.3,88.3,-21.3,194.3),'head':(-75.1,233.0,68.9,356.8),
'headB':(-88.9,248.9,97.1,404.8),'hipF':(-49.6,111.4,70.4,161.4),'legB':(16.7,1.2,60.7,91.2),
'legF':(-55.6,-13.2,-9.5,86.9),'shadow':(-129.2,-123.0,130.8,136.7),'tail':(-125.9,113.3,12.1,169.2),
'thighB':(-3.1,56.5,86.9,158.5),'thighF':(-77.3,55.1,24.7,159.1)}
order=['shadow','tail','hairB','headB','armB','handB','legB','thighB','legF','thighF','body','hipF','head','armF','hairF','face','handF']
col={'tail':'#b08968','hairB':'#6c757d','headB':'#8d99ae','armB':'#8ecae6','handB':'#bde0fe','legB':'#74c69d','thighB':'#95d5b2','legF':'#52b788','thighF':'#40916c','body':'#e9c46a','hipF':'#f4a261','head':'#ffd6a5','armF':'#219ebc','hairF':'#6c757d','face':'#ffe8d6','handF':'#90e0ef','shadow':'#333340'}
SC=2.4;ox,oy=330,170;W,H=int(700*SC*0.8),int(640*SC*0.8)
im=Image.new('RGB',(W,H),'#1b1b1f');d=ImageDraw.Draw(im,'RGBA');f=ImageFont.load_default()
P=lambda x,y:(ox+x*SC,H-oy-y*SC)
for y in range(-100,451,50):
    a=P(-200,y);d.line([a,P(200,y)],fill=(80,80,90,80));d.text((4,a[1]-5),str(y),fill='#888',font=f)
d.line([P(-200,0),P(200,0)],fill='#777',width=2)
for n in order:
    x0,y0,x1,y1=R[n];a=P(x0,y1);b=P(x1,y0)
    d.rectangle([a,b],fill=tuple(int(col[n][i:i+2],16) for i in (1,3,5))+((60,) if n=='shadow' else (150,)),outline='#111')
    d.text((a[0]+3,a[1]+2),n,fill='white',font=f)
# 지표
body_top=R['hairB'][3];feet=R['legF'][1]
hh=R['head'][3]-R['head'][1];total=R['head'][3]-feet
d.text((10,8),f'mannequin v1 (setup pose rects, units)  head {hh:.0f} / body+head {total:.0f}  = {total/hh:.2f} heads',fill='white',font=f)
im.save('rnd/mannequin/mannequin_v1_preview.png');print(W,H,round(hh,1),round(total,1),round(total/hh,2))
json.dump({'unit_note':'부위 이미지의 월드 단위는 아틀라스 픽셀의 2배(부착 크기 910 = 2×455). 아래는 설정 자세(setup pose)의 월드 사각형 [x0,y0,x1,y1].','part_rects_setup_pose':R,'draw_order_back_to_front':order,'metrics':{'head_height':round(hh,1),'total_height_feet_to_head_top':round(total,1),'heads':round(total/hh,2)}},open('rnd/mannequin/mannequin_v1_rects.json','w'),ensure_ascii=False,indent=1)
