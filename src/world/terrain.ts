import * as T from 'three';
import {exhibitPoint} from '../../shared/exhibit-layout.mjs';
import {regionRoutes} from '../../shared/region-routes.mjs';
import type { Exhibit,Region } from '../core/types';
import {seasonalColors} from './season-style';

/** Paint intersecting paths into one surface: no coplanar meshes or floating road markings. */
export function groundTexture(radius:number,color:string,exhibits:Exhibit[],anisotropy:number,season?:keyof typeof seasonalColors,region?:Region){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  const ctx=canvas.getContext('2d')!,scale=canvas.width/(radius*2);
  const base=season?seasonalColors[season].ground:new T.Color(color).lerp(new T.Color('#dfedcf'),.6).getStyle();
  ctx.fillStyle=base;ctx.fillRect(0,0,2048,2048);
  ctx.translate(1024,1024);ctx.scale(scale,scale);
  if(season==='summer'){const beach=ctx.createRadialGradient(0,0,radius-6,0,0,radius);beach.addColorStop(0,'rgba(255,231,176,0)');beach.addColorStop(.5,'#ffe9b4');beach.addColorStop(1,'#f4cf8b');ctx.fillStyle=beach;ctx.fillRect(-radius,-radius,radius*2,radius*2);}
  let seed=7341;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<(season==='winter'?12000:22000);i++){
    const x=(random()*2-1)*radius,z=(random()*2-1)*radius;
    ctx.strokeStyle=season==='winter'?(i%3?'rgba(147,174,188,.09)':'rgba(255,255,255,.45)'):i%3?'rgba(92,137,91,.10)':'rgba(255,255,227,.20)';ctx.lineWidth=.013;
    ctx.beginPath();ctx.moveTo(x,z);ctx.quadraticCurveTo(x+.02,z-.025,x+(random()-.5)*.07,z-.045-random()*.07);ctx.stroke();
  }
  // Broad, low-contrast clover patches survive minification without sparkling.
  for(let i=0;i<420;i++){
    const x=Math.sin(i*127.1)*radius,z=Math.cos(i*311.7)*radius;
    ctx.fillStyle=season==='winter'?'rgba(255,255,255,.20)':i%2?'rgba(255,255,242,.17)':'rgba(103,158,124,.08)';
    ctx.beginPath();ctx.ellipse(x,z,.07+(i%4)*.025,.045, i,0,Math.PI*2);ctx.fill();
  }
  const paths=document.createElement('canvas');paths.width=paths.height=2048;
  if(season==='autumn'){
    for(let i=0;i<6500;i++){const x=(random()*2-1)*radius,z=(random()*2-1)*radius;if(Math.hypot(x,z)>radius-.4)continue;ctx.save();ctx.translate(x,z);ctx.rotate(random()*Math.PI*2);ctx.fillStyle=['#c98045','#d89e50','#b9794b','#e3b765'][i%4];ctx.globalAlpha=.4+random()*.3;const size=.055+random()*.08;ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.3,-size*.25);ctx.lineTo(size,-size*.45);ctx.lineTo(size*.55,size*.15);ctx.lineTo(size*.8,size*.45);ctx.lineTo(0,size*.6);ctx.lineTo(-size*.8,size*.45);ctx.lineTo(-size*.55,size*.15);ctx.lineTo(-size,-size*.45);ctx.lineTo(-size*.3,-size*.25);ctx.closePath();ctx.fill();ctx.restore();}
  }
  const p=paths.getContext('2d')!;p.translate(1024,1024);p.scale(scale,scale);
  p.strokeStyle=p.fillStyle=season==='winter'?'#c7d6d9':season==='autumn'?'#e0d5c8':'#f5e8d4';p.lineWidth=2.65;p.lineCap=p.lineJoin='round';
  const disc=(x:number,z:number,r:number)=>{p.beginPath();p.arc(x,z,r,0,Math.PI*2);p.fill();};
  if(region)for(const route of regionRoutes(region,exhibits)){p.lineWidth=route.width;p.beginPath();route.points.forEach(([x,z],i)=>i?p.lineTo(x,z):p.moveTo(x,z));p.stroke();}p.lineWidth=2.65;
  disc(...(region?.forecourt??[0,7]) as [number,number],2.8);
  if(exhibits.length){
    for(const m of exhibits){
      const [x,z]=m.position;

      const front=exhibitPoint(m,0,4.8);disc(x,z,4.35);disc(front.x,front.z,1.65);
    }
  }else{disc(0,0,radius-.4);}
  // Tile joints are ink in this same texture, including at path intersections.
  p.globalCompositeOperation='source-atop';p.strokeStyle='rgba(179,154,127,.20)';p.lineWidth=.018;
  for(let row=-Math.ceil(radius);row<=radius;row++){
    p.beginPath();p.moveTo(-radius,row);p.lineTo(radius,row);p.stroke();
    for(let col=-Math.ceil(radius);col<=radius;col++){
      const x=col*1.25+(row%2)*.625;
      p.fillStyle=`rgba(${col%3===0?'157,134,104':'255,255,248'},${.018+random()*.035})`;p.fillRect(x+.025,row+.025,1.2,.95);
      p.beginPath();p.moveTo(x,row);p.lineTo(x,row+1);p.stroke();
    }
  }
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(paths,0,0);
  // Soft contact shading is painted into the ground, not a stack of coplanar shadow planes.
  for(const m of exhibits){const cx=1024+m.position[0]*scale,cy=1024+m.position[1]*scale,rad=4.8*scale,g=ctx.createRadialGradient(cx,cy,rad*.25,cx,cy,rad);g.addColorStop(0,'rgba(55,66,64,.16)');g.addColorStop(.72,'rgba(65,72,62,.10)');g.addColorStop(1,'rgba(65,72,62,0)');ctx.fillStyle=g;ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);}

  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=anisotropy;texture.minFilter=T.LinearMipmapLinearFilter;
  return texture;
}
