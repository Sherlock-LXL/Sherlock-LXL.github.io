import type { Obstacle } from './scenery';

/** Preset geometry has matching colliders, so open arches and exhibition floors stay usable. */
export function exhibitColliders(kind:string,x:number,z:number):Obstacle[]{
  const shapes:Obstacle[]=[];
  const box=(dx:number,dz:number,halfX:number,halfZ:number,height:number)=>shapes.push({x:x+dx,z:z+dz,radius:0,halfX,halfZ,height});
  const circle=(dx:number,dz:number,radius:number,height:number)=>shapes.push({x:x+dx,z:z+dz,radius,height});
  circle(0,0,4.05,.07);
  const presets:Record<string,()=>void>={
    tower:()=>box(0,0,2.35,2.35,11.8),
    forest:()=>{circle(0,1,.8,2.85);for(const [dx,dz] of [[-2,-1],[2,-1],[0,-2.5]])circle(dx,dz,.22,5);},
    mirror:()=>{box(0,0,2.25,1.5,.4);box(0,0,2.05,.3,5.6);for(const dx of [-2.35,2.35])box(dx,0,.15,.4,4.8);},
    garden:()=>{box(0,0,1.4,.75,1.75);for(const dx of [-2,2])box(dx,0,.16,.16,5.9);for(const dx of [-1.65,1.65])box(dx,1.25,.48,.33,1.02);},
    gift:()=>box(0,0,1.55,1.55,3.6),
    bubble:()=>{circle(0,0,3.5,.5);circle(0,0,2.6,.68);circle(0,0,2.15,3.5);for(const dx of [-3,3])box(dx,0,.15,.15,3);},
    light:()=>presets.bubble(),
    gallery:()=>{box(0,0,3.5,2.5,.5);box(0,-2,3.5,.2,4.8);box(-3.3,0,.2,2,4.8);box(0,1,1.5,.4,1.15);},
    music:()=>{circle(0,0,3.6,.5);box(0,0,1.8,.8,2.85);box(0,1,1.8,.35,2);},
    studio:()=>{box(0,0,4,3,.5);box(0,-2,4,.25,6);for(const dx of [-3.2,3.2])box(dx,.9,.4,.33,1.85);box(2,1.1,.65,.48,2.15);circle(-1.5,1.3,.15,2.25);}
  };
  (presets[kind]??(()=>circle(0,0,2.1,6)))();return shapes;
}
