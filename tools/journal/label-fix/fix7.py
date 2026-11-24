from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
D='/tmp/claude-0/-workspace/fcca7691-a06e-5b3e-bd18-2ac4baae136f/'
FONT=D.replace('-workspace/','-workspace-prestonhillestates/')+'scratchpad/render/node_modules/@fontsource/jost/files/jost-latin-%s-normal.woff2'
im=Image.open(D+'images/7.jpg').convert('RGB'); a=np.asarray(im).astype(float)
rng=np.random.default_rng(5)
def erase(x0,y0,x1,y1):
    k=np.ones(9)/9
    def sm(v): return np.stack([np.convolve(np.pad(v[:,c],4,mode='edge'),k,'valid') for c in range(3)],1)
    top=sm(np.median(a[y0-5:y0-1],0)); bot=sm(np.median(a[y1+1:y1+5],0))
    for y in range(y0,y1):
        t=(y-y0)/max(1,(y1-y0)); a[y,x0:x1]=(1-t)*top[x0:x1]+t*bot[x0:x1]+rng.normal(0,1.4,(x1-x0,3))
erase(476,666,534,686)   # NO / PROBIOTICS
erase(552,651,594,675)   # ZINC / 160% NRV
erase(346,653,393,677)   # SIX / NUTRIENTS
erase(337,653,346,672)
out=Image.fromarray(np.clip(a,0,255).astype('uint8'))
def text(img, cx, cy, s, size, colour, spacing, angle):
    k=4; f=ImageFont.truetype(FONT%'500', size*k)
    w=sum(f.getlength(ch) for ch in s)+spacing*k*(len(s)-1); h=int(size*k*1.35)
    layer=Image.new('L',(int(w)+16,h+16),0); d=ImageDraw.Draw(layer); x=8
    for ch in s: d.text((x,8),ch,font=f,fill=255); x+=f.getlength(ch)+spacing*k
    layer=layer.rotate(angle,resample=Image.BICUBIC,expand=True)
    layer=layer.resize((max(1,layer.width//k),max(1,layer.height//k)),Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.3))
    img.paste(Image.new('RGB',layer.size,colour),(int(cx-layer.width/2),int(cy-layer.height/2)),layer)
INK=(58,52,44)
text(out,503.5,671.5,'NO',7.4,INK,1.0,4)
text(out,504.5,680.0,'PROBIOTICS',7.4,INK,1.0,4.5)
text(out,573,657.5,'ZINC',7.4,INK,1.0,13)
text(out,573,666.5,'160% NRV',7.4,INK,1.0,16)
text(out,360.5,659,'SIX',7.4,INK,1.0,-12)
text(out,362,668,'NUTRIENTS',7.4,INK,1.0,-15)
out.save(D+'scratchpad/label/7-fixed.png')
out.crop((320,600,620,700)).resize((1200,400),Image.LANCZOS).save(D+'scratchpad/label/7-check.png')
