import * as T from 'three';
import {exhibitPoint} from '../../shared/exhibit-layout.mjs';
import {regionRoutes} from '../../shared/region-routes.mjs';
import type { Exhibit,Region } from '../core/types';
import {seasonalColors} from './season-style';

type Ground={base:string;washes:string[];strokes:[string,string];path:string;slab:string;joint:string;edge:string;rim:string};
/** Mineral grounds, one per season; the hub is paved stone. */
const grounds:Record<string,Ground>={
  spring:{base:seasonalColors.spring.ground,washes:['#6c9762','#a3b981','#5b8869'],strokes:['rgba(52,96,64,.17)','rgba(226,230,180,.2)'],path:'#cbc1aa',slab:'#b9ae96',joint:'rgba(88,76,60,.42)',edge:'#6d6656',rim:'#5f8a62'},
  summer:{base:seasonalColors.summer.ground,washes:['#8eac72','#b8c08a','#79a06d'],strokes:['rgba(66,106,66,.16)','rgba(244,238,200,.2)'],path:'#c6bca6',slab:'#b3a88f',joint:'rgba(92,80,62,.4)',edge:'#6e6655',rim:'#d7c597'},
  autumn:{base:seasonalColors.autumn.ground,washes:['#a87b40','#cfac66','#93864f'],strokes:['rgba(110,74,36,.16)','rgba(250,226,170,.18)'],path:'#bcb4a2',slab:'#aaa18d',joint:'rgba(84,72,56,.42)',edge:'#6b604e',rim:'#8f7a46'},
  winter:{base:seasonalColors.winter.ground,washes:['#d3dde5','#f5f7f7','#c6d1d8'],strokes:['rgba(120,146,164,.12)','rgba(255,255,255,.5)'],path:'#939ea4',slab:'#86929a',joint:'rgba(54,64,72,.42)',edge:'#5d676d',rim:'#c3cfd6'},
  hub:{base:'#c8bea9',washes:['#b9ae97','#d6ccb7','#c2b8a2'],strokes:['rgba(110,96,74,.08)','rgba(255,250,236,.14)'],path:'#d0c6b1',slab:'#c3b8a1',joint:'rgba(92,80,62,.45)',edge:'#7a705e',rim:'#a69b85'},
};

/** Paint intersecting paths into one surface: no coplanar meshes or floating road markings. */
export function groundTexture(radius:number,color:string,exhibits:Exhibit[],anisotropy:number,season?:keyof typeof seasonalColors,region?:Region){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  const ctx=canvas.getContext('2d')!,scale=canvas.width/(radius*2),g=grounds[season??'hub'];
  void color;
  ctx.fillStyle=g.base;ctx.fillRect(0,0,2048,2048);
  ctx.translate(1024,1024);ctx.scale(scale,scale);
  let seed=7341+Math.round(radius*13);const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  // Layered pigment washes: soft-edged pools of three related tones.
  for(let i=0;i<170;i++){
    const a=random()*Math.PI*2,d=Math.sqrt(random())*radius,x=Math.cos(a)*d,z=Math.sin(a)*d,r=1.2+random()*4.5,wash=ctx.createRadialGradient(x,z,0,x,z,r);
    const tone=new T.Color(g.washes[i%3]);wash.addColorStop(0,`rgba(${tone.r*255|0},${tone.g*255|0},${tone.b*255|0},${.16+random()*.16})`);wash.addColorStop(1,`rgba(${tone.r*255|0},${tone.g*255|0},${tone.b*255|0},0)`);
    ctx.fillStyle=wash;ctx.beginPath();ctx.ellipse(x,z,r*1.4,r,random()*3,0,Math.PI*2);ctx.fill();
  }
  if(season==='summer'){const beach=ctx.createRadialGradient(0,0,radius-5.5,0,0,radius);beach.addColorStop(0,'rgba(219,201,152,0)');beach.addColorStop(.55,'rgba(219,201,152,.92)');beach.addColorStop(1,'#d9c393');ctx.fillStyle=beach;ctx.fillRect(-radius,-radius,radius*2,radius*2);}
  // Fine brush texture: grass flicks, snow glints.
  for(let i=0;i<(season==='winter'?11000:24000);i++){
    const x=(random()*2-1)*radius,z=(random()*2-1)*radius;
    ctx.strokeStyle=g.strokes[i%3?0:1];ctx.lineWidth=.014;
    ctx.beginPath();ctx.moveTo(x,z);ctx.quadraticCurveTo(x+.02,z-.025,x+(random()-.5)*.07,z-.045-random()*.08);ctx.stroke();
  }
  if(season==='autumn'){
    for(let i=0;i<7000;i++){const x=(random()*2-1)*radius,z=(random()*2-1)*radius;if(Math.hypot(x,z)>radius-.4)continue;ctx.save();ctx.translate(x,z);ctx.rotate(random()*Math.PI*2);ctx.fillStyle=['#b4462e','#cc7a3a','#a0532f','#d9a548'][i%4];ctx.globalAlpha=.45+random()*.35;const size=.055+random()*.08;ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.3,-size*.25);ctx.lineTo(size,-size*.45);ctx.lineTo(size*.55,size*.15);ctx.lineTo(size*.8,size*.45);ctx.lineTo(0,size*.6);ctx.lineTo(-size*.8,size*.45);ctx.lineTo(-size*.55,size*.15);ctx.lineTo(-size,-size*.45);ctx.lineTo(-size*.3,-size*.25);ctx.closePath();ctx.fill();ctx.restore();}
    ctx.globalAlpha=1;
  }
  // A darker band at the rim seats every island on its cliff.
  const rim=new T.Color(g.rim),rimWash=ctx.createRadialGradient(0,0,radius-2.2,0,0,radius);rimWash.addColorStop(0,`rgba(${rim.r*255|0},${rim.g*255|0},${rim.b*255|0},0)`);rimWash.addColorStop(1,`rgba(${rim.r*255|0},${rim.g*255|0},${rim.b*255|0},.75)`);ctx.fillStyle=rimWash;ctx.fillRect(-radius,-radius,radius*2,radius*2);
  // Paths: a dark kerb first, then stone, then joints inked only where stone exists.
  const paths=document.createElement('canvas');paths.width=paths.height=2048;
  const p=paths.getContext('2d')!;p.translate(1024,1024);p.scale(scale,scale);p.lineCap=p.lineJoin='round';
  const shapes:{kind:'line';width:number;points:number[][]}[]=[],discs:[number,number,number][]=[];
  if(region)for(const route of regionRoutes(region,exhibits))shapes.push({kind:'line',width:route.width,points:route.points});
  if(region)discs.push([...(region.forecourt??[0,7]) as [number,number],2.8]);
  for(const m of exhibits){const [x,z]=m.position,front=exhibitPoint(m,0,4.8);discs.push([x,z,4.35],[front.x,front.z,1.65]);}
  const paint=(style:string,grow:number)=>{p.strokeStyle=p.fillStyle=style;
    for(const s of shapes){p.lineWidth=s.width+grow*2;p.beginPath();s.points.forEach(([x,z],i)=>i?p.lineTo(x,z):p.moveTo(x,z));p.stroke();}
    for(const [x,z,r] of discs){p.beginPath();p.arc(x,z,r+grow,0,Math.PI*2);p.fill();}};
  if(region){paint(g.edge,.14);paint(g.path,0);}
  else{p.fillStyle=g.path;p.beginPath();p.arc(0,0,radius-.4,0,Math.PI*2);p.fill();}
  p.globalCompositeOperation='source-atop';p.strokeStyle=g.joint;p.lineWidth=.024;
  if(region){
    for(let row=-Math.ceil(radius);row<=radius;row++){
      p.beginPath();p.moveTo(-radius,row);p.lineTo(radius,row);p.stroke();
      for(let col=-Math.ceil(radius);col<=radius;col++){
        const x=col*1.25+(row%2)*.625;
        p.fillStyle=`rgba(${random()<.5?'120,104,82':'255,250,236'},${.03+random()*.07})`;p.fillRect(x+.03,row+.03,1.19,.94);
        p.beginPath();p.moveTo(x,row);p.lineTo(x,row+1);p.stroke();
      }
    }
  }else{
    // Round heaven: concentric courses of slabs, each course divided more finely as it widens.
    for(let r=1.1,course=0;r<radius;r+=1.15,course++){
      p.beginPath();p.arc(0,0,r,0,Math.PI*2);p.stroke();
      const count=Math.max(6,Math.round(r*Math.PI*2/1.3)),offset=course%2?.5:0;
      for(let k=0;k<count;k++){const a=(k+offset)/count*Math.PI*2;p.beginPath();p.moveTo(Math.cos(a)*r,Math.sin(a)*r);p.lineTo(Math.cos(a)*(r+1.15),Math.sin(a)*(r+1.15));p.stroke();
        p.fillStyle=`rgba(${random()<.5?'120,104,82':'255,250,236'},${.03+random()*.07})`;p.beginPath();p.arc(0,0,r+1.1,a+.01,a+Math.PI*2/count-.01);p.arc(0,0,r+.05,a+Math.PI*2/count-.01,a+.01,true);p.fill();}
    }
    p.lineWidth=.12;p.strokeStyle=g.edge;p.beginPath();p.arc(0,0,radius-.55,0,Math.PI*2);p.stroke();
  }
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(paths,0,0);
  // Soft contact shading is painted into the ground, not a stack of coplanar shadow planes.
  for(const m of exhibits){const cx=1024+m.position[0]*scale,cy=1024+m.position[1]*scale,rad=4.8*scale,shade=ctx.createRadialGradient(cx,cy,rad*.25,cx,cy,rad);shade.addColorStop(0,'rgba(48,52,48,.18)');shade.addColorStop(.72,'rgba(56,60,52,.1)');shade.addColorStop(1,'rgba(56,60,52,0)');ctx.fillStyle=shade;ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=anisotropy;texture.minFilter=T.LinearMipmapLinearFilter;
  return texture;
}
