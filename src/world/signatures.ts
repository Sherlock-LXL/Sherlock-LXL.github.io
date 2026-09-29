import * as T from 'three';
import type {Catalog} from '../core/types';
import {groundHeight} from '../../shared/terrain-height.mjs';
import {daylight} from '../../shared/atmosphere.mjs';

/** Instanced/point effects: a handful of draw calls for distinct regional rhythms. */
export class Signatures {
  private effects:{kind:string;points:T.Points;positions:Float32Array;count:number}[]=[];private time=0;
  constructor(scene:T.Scene,catalog:Catalog){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,3,32,32,31);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.5,'rgba(255,255,255,.7)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const sparkle=new T.CanvasTexture(canvas);
    for(const module of catalog.modules){
      const kind=module.world?.ambience;if(!kind)continue;const region=catalog.regions.find(r=>r.id===module.region)!;
      const count=kind==='tokens'?64:kind==='fireflies'?28:kind==='bubbles'?22:kind==='stage'?24:5,positions=new Float32Array(count*3);
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
      const points=new T.Points(geometry,new T.PointsMaterial({map:sparkle,color:{tokens:'#bcf1e1',fireflies:'#f4e8a5',bubbles:'#d3eaf1',resonance:'#daeaff',stage:'#e4c6e3'}[kind],size:kind==='bubbles'?.22:kind==='resonance'?.3:.12,transparent:true,opacity:.7,depthWrite:false}));
      if(kind==='bubbles'){
        geometry.setAttribute('life',new T.BufferAttribute(new Float32Array(count),1));
        points.material.onBeforeCompile=shader=>{shader.vertexShader='attribute float life;varying float lifeFade;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('gl_PointSize = size;','lifeFade=smoothstep(0.0,0.12,life)*(1.0-smoothstep(0.9,1.0,life)); gl_PointSize = size*sqrt(lifeFade);');shader.fragmentShader='varying float lifeFade;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('vec4( diffuse, opacity )','vec4( diffuse, opacity * lifeFade )');};
        points.material.customProgramCacheKey=()=> 'xiangmeta-bubble-life-v1';
      }
      points.position.set(region.position[0]+module.position[0],0,region.position[1]+module.position[1]);points.position.y=groundHeight(points.position.x,points.position.z,catalog.regions);points.frustumCulled=false;points.name=`signature-${module.id}`;scene.add(points);this.effects.push({kind,points,positions,count});
    }
  }
  update(dt:number,hour:number,reduced:boolean){
    if(!reduced)this.time+=dt;const night=1-daylight(hour).day;
    for(const e of this.effects){
      const {kind,positions,count}=e,t=this.time;
      (e.points.material as T.PointsMaterial).opacity=kind==='fireflies'?night*.8:kind==='tokens'||kind==='stage'?.17+night*.65:kind==='resonance'?(reduced?.15:(.06+Math.pow(Math.max(0,Math.sin(t*.7)),26)*.7)*(.4+night*.6)):.5;
      for(let i=0;i<count;i++){
        const phase=(t*(kind==='bubbles'?.15:.06)+i/count)%1,a=i*2.4+t*.18;
        let x=0,y=0,z=0;
        if(kind==='tokens'){x=Math.cos(a)*2.8;y=.6+phase*10.7;z=Math.sin(a)*2.8;}
        if(kind==='fireflies'){x=Math.sin(a)*2.5;y=.55+Math.sin(t*.7+i)*.25+i%3*.35;z=Math.cos(a*.8)*2.4;}
        if(kind==='bubbles'){x=Math.cos(i*2.4)*(1-phase*.3)*1.5;y=.75+phase*2.35;z=Math.sin(i*2.4)*(1-phase*.3)*1.5;e.points.geometry.attributes.life.setX(i,phase);}
        if(kind==='resonance'){x=Math.cos(a)*.15;y=3.1+Math.sin(a)*.15;z=Math.sin(a)*.15;}
        if(kind==='stage'){x=-3+i*.26;y=1.2+Math.sin(t*.8+i*.5)*.16;z=1.7;}
        positions.set([x,y,z],i*3);
      }
      e.points.geometry.attributes.position.needsUpdate=true;
      if(kind==='bubbles')e.points.geometry.attributes.life.needsUpdate=true;
    }
  }
}
