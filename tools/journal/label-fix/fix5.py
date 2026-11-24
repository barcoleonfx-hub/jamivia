from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
D='/tmp/claude-0/-workspace/fcca7691-a06e-5b3e-bd18-2ac4baae136f/'
FONT=D.replace('-workspace/','-workspace-prestonhillestates/')+'scratchpad/render/node_modules/@fontsource/jost/files/jost-latin-%s-normal.woff2'
im=Image.open(D+'images/5.jpg').convert('RGB'); a=np.asarray(im).astype(float)
rng=np.random.default_rng(3)
def erase(x0,y0,x1,y1):
    """fill a box by blending the clean rows just above and below it, column by column"""
    k=np.ones(9)/9
    def sm(v): return np.stack([np.convolve(np.pad(v[:,c],4,mode='edge'),k,'valid') for c in range(3)],1)
    top=sm(np.median(a[y0-6:y0-2],0)); bot=sm(np.median(a[y1+2:y1+6],0))
    for y in range(y0,y1):
        t=(y-y0)/max(1,(y1-y0))
        a[y,x0:x1]=(1-t)*top[x0:x1]+t*bot[x0:x1]+rng.normal(0,1.6,(x1-x0,3))
# erase the garbled lines (and their whole rows so spacing is even)
erase(390,764,545,776)   # A FOUNDATIONAL DAILY BLEND
erase(418,776,515,787)   # OF SIX NUTRIENTS
erase(360,818,404,836)   # SIX / NUTRIENTS
erase(420,818,452,836)   # PLANT / FIBRE
erase(470,818,524,836)   # NO / PROBIOTICS
erase(530,818,574,836)   # ZINC / 160% NRV
out=Image.fromarray(np.clip(a,0,255).astype('uint8'))
# text, drawn at 4x then reduced so it is as soft as the photo's own printing
def text(img, cx, y, s, size, colour, spacing, weight='500'):
    k=4; f=ImageFont.truetype(FONT%weight, size*k)
    w=sum(f.getlength(ch) for ch in s)+spacing*k*(len(s)-1); h=int(size*k*1.4)
    layer=Image.new('L',(int(w)+8,h),0); d=ImageDraw.Draw(layer); x=4
    for ch in s: d.text((x,0),ch,font=f,fill=255); x+=f.getlength(ch)+spacing*k
    layer=layer.resize((max(1,layer.width//k),max(1,layer.height//k)),Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.35))
    col=Image.new('RGB',layer.size,colour)
    img.paste(col,(int(cx-layer.width/2),int(y)),layer)
INK=(72,70,60)
text(out,467,764.2,'A FOUNDATIONAL DAILY BLEND',7.6,INK,1.25)
text(out,466,776.2,'OF SIX NUTRIENTS',7.6,INK,1.25)
text(out,380,818.6,'SIX',5.9,INK,0.9)
text(out,380,826.2,'NUTRIENTS',5.9,INK,0.9)
text(out,436,818.6,'PLANT',5.9,INK,0.9)
text(out,436,826.2,'FIBRE',5.9,INK,0.9)
text(out,497,818.6,'NO',5.9,INK,0.9)
text(out,497,826.2,'PROBIOTICS',5.9,INK,0.9)
text(out,552,818.6,'ZINC',5.9,INK,0.9)
text(out,552,826.2,'160% NRV',5.9,INK,0.9)
# the green band: repaint its text area in the band's own green, then the true words
b=np.asarray(out).astype(float)
band=b[848:858,362:568]; green=np.median(b[846:860,365:570].reshape(-1,3),axis=0)
dark=b[846:860,365:570].reshape(-1,3); dark=dark[dark.sum(1)<dark.sum(1).mean()]
green=np.median(dark,axis=0)
lum=b[...,:3].mean(2)
for x in range(362,572):
    seg=b[840:868,x]; isg=((seg[:,1]-seg[:,0]>6)&(seg.mean(1)<120))|(seg.mean(1)<72)
    col=np.where(isg)[0]
    if len(col)<4: continue
    t,bm=840+col.min(),840+col.max()
    b[t+1:bm,x]=green+rng.normal(0,1.2,(bm-t-1,3))
out=Image.fromarray(np.clip(b,0,255).astype('uint8'))
text(out,465,848.4,'FOOD SUPPLEMENT    |    UNFLAVOURED POWDER',6.4,(232,229,218),1.05)
out.save(D+'scratchpad/label/5-fixed.png')
out.crop((350,755,600,875)).resize((1000,480),Image.LANCZOS).save(D+'scratchpad/label/5-check.png')
print('green',green)
