# 프로토타입을 그림·코드까지 한 파일(dist/guild_preview.html)로 묶는다. 사용: python tools/bundle_preview.py
import re,base64,io,os,json
from PIL import Image
import sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B=os.path.join(ROOT,'prototype')+os.sep
html=open(B+'index.html',encoding='utf-8').read();inline={}
for root,_,fs in os.walk(B+'assets'):
  for f in fs:
    if not f.endswith('.png'): continue
    p=os.path.join(root,f); rel=os.path.relpath(p,B+'assets').replace(os.sep,'/'); im=Image.open(p); b=io.BytesIO()
    if rel.startswith('lobby/'): im.convert('RGB').save(b,'JPEG',quality=86); mime='image/jpeg'
    else: im.save(b,'PNG',optimize=True); mime='image/png'
    inline[rel]=f'data:{mime};base64,'+base64.b64encode(b.getvalue()).decode()
out=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>\n'+open(B+m.group(1),encoding='utf-8').read()+'\n</script>',html)
i=out.index('<script>');out=out[:i]+'<script>window.ASSET_INLINE='+json.dumps(inline)+';</script>\n'+out[i:]
os.makedirs(os.path.join(ROOT,'dist'),exist_ok=True);open(os.path.join(ROOT,'dist','guild_preview.html'),'w',encoding='utf-8').write(out);print(round(len(out)/1e6,1),'MB')
