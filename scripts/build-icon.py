"""Build the application icon from the world's eight-ray emblem."""
from pathlib import Path
from PIL import Image,ImageDraw
import math
root=Path(__file__).resolve().parents[1]
size=512
im=Image.new('RGBA',(size,size));d=ImageDraw.Draw(im)
d.rounded_rectangle((4,4,508,508),radius=112,fill='#10252b',outline='#466663',width=6)
for i in range(8):
    a=math.pi*i/4
    start=(256+math.cos(a)*38,256+math.sin(a)*38)
    end=(256+math.cos(a)*166,256+math.sin(a)*166)
    d.line((start,end),fill='#c1dfa7',width=17)
    x,y=end;d.ellipse((x-8,y-8,x+8,y+8),fill='#c1dfa7')
d.polygon(((256,212),(300,256),(256,300),(212,256)),fill='#e1efce')
im.save(root/'desktop/icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
