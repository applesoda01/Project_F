from PIL import ImageFont
import glob
def kfont(size=14):
    for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc']+glob.glob('/usr/share/fonts/opentype/noto/NotoSansCJK*.ttc'):
        try: return ImageFont.truetype(f,size,index=1)   # index 1 = KR in most ttc
        except Exception: pass
    return ImageFont.load_default()
