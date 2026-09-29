import * as T from 'three';

/** Original decorative studies, kept separate from the owner's future photo assets. */
export function artwork(index:number){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
  const c=canvas.getContext('2d')!,palettes=[['#e5ede0','#b1cdbd','#7ea9a0','#ead3ab'],['#f6e3d4','#dfbda9','#a78b9b','#edcb96'],['#e3e7f4','#bac9db','#899daf','#edddb9']];
  const [paper,near,far,sun]=palettes[index%3];
  c.fillStyle=paper;c.fillRect(0,0,512,768);
  c.fillStyle=sun;c.beginPath();c.arc(335-index*60,205,73,0,Math.PI*2);c.fill();
  for(let layer=0;layer<4;layer++){
    c.fillStyle=layer%2?near:far;c.globalAlpha=.45+layer*.12;
    c.beginPath();c.moveTo(0,490+layer*47);
    for(let x=0;x<=512;x+=8)c.lineTo(x,435+layer*62+Math.sin(x*.009+layer*1.8+index)*62+Math.cos(x*.017+layer)*22);
    c.lineTo(512,768);c.lineTo(0,768);c.closePath();c.fill();
  }
  c.globalAlpha=.5;c.strokeStyle=far;c.lineWidth=3;c.beginPath();c.moveTo(85,680);c.quadraticCurveTo(140,470,105,310);c.stroke();
  for(let i=0;i<7;i++){const side=i%2?-1:1;c.fillStyle=near;c.beginPath();c.ellipse(111+side*24,355+i*40,32,10,side*.55,0,Math.PI*2);c.fill();}
  c.globalAlpha=.14;c.fillStyle='#fffdf6';
  for(let i=0;i<450;i++){c.beginPath();c.arc((Math.sin(i*71.3)*.5+.5)*512,(Math.cos(i*123.7)*.5+.5)*768,1.4,0,Math.PI*2);c.fill();}
  c.globalAlpha=1;c.strokeStyle='#fff6e8';c.lineWidth=14;c.strokeRect(14,14,484,740);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return new T.MeshStandardMaterial({map,roughness:.95,metalness:0});
}
