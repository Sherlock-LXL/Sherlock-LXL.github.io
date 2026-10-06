import * as T from 'three';
import {material,mesh,tree} from './architecture';
import {nightLight} from './hub';
import type {Region} from '../core/types';
import type {Obstacle} from './scenery';

export type RegionLandmark={root:T.Group;colliders:Obstacle[]};

/** Optional supporting architecture. Project exhibits remain each island's primary landmarks. */
export function regionLandmark(region:Region):RegionLandmark|null{
  const root=new T.Group();root.name=`landmark-${region.id}`;
  if(region.id==='science-valley')return {root,colliders:scienceLandmark(root)};
  if(region.id==='personal-museum')return {root,colliders:museumLandmark(root)};
  return null;
}

function scienceLandmark(root:T.Group):Obstacle[]{
  const stone=material('#e8edf0',.9,.03,'stone');
  const metal=material('#6c8692',.45,.4,'metal');
  const cold=material('#5c7c84',.4,.55,'metal');
  const iceGlow=nightLight('#bfe6ea');
  const dome=new T.Group();dome.position.set(0,0,-10.8);root.add(dome);

  mesh(dome,new T.CylinderGeometry(3.25,3.55,.5,48),stone,0,.25);
  mesh(dome,new T.CylinderGeometry(3.0,3.2,.28,48),material('#d5e2e6',.9,0,'stone'),0,.54);
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    mesh(dome,new T.BoxGeometry(.16,2.05,.16),stone,Math.sin(a)*2.82,1.48,Math.cos(a)*2.82);
  }
  mesh(dome,new T.CylinderGeometry(2.92,2.92,2.05,48,1,true),new T.MeshStandardMaterial({
    color:'#e4eef2',roughness:.85,metalness:.05,side:T.DoubleSide,
  }),0,1.55);
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2+Math.PI/10;
    const port=mesh(dome,new T.TorusGeometry(.24,.035,8,24),metal,Math.sin(a)*2.93,2.02,Math.cos(a)*2.93);
    port.rotation.y=a;
  }

  const domeShape=new T.SphereGeometry(2.93,32,16,0,Math.PI*2,0,Math.PI/2);
  const domeMat=new T.MeshPhysicalMaterial({
    color:'#e6f1f4',metalness:.1,roughness:.16,transmission:.26,ior:1.3,
    thickness:.45,clearcoat:.6,transparent:true,opacity:.78,depthWrite:false,
  });
  mesh(dome,domeShape,domeMat,0,2.56).castShadow=false;
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    const rib=Array.from({length:14},(_,j)=>{
      const p=j/13*Math.PI/2;
      return new T.Vector3(Math.sin(a)*Math.cos(p)*2.93,2.56+Math.sin(p)*2.93,Math.cos(a)*Math.cos(p)*2.93);
    });
    mesh(dome,new T.TubeGeometry(new T.CatmullRomCurve3(rib),22,.042,8,false),cold);
  }
  const belt=mesh(dome,new T.TorusGeometry(2.93,.065,10,64),metal,0,2.58);belt.rotation.x=Math.PI/2;

  const scope=new T.Group();scope.position.set(0,5.12,0);scope.rotation.z=.5;dome.add(scope);
  mesh(scope,new T.CylinderGeometry(.3,.3,1.85,24),metal);
  mesh(scope,new T.CylinderGeometry(.37,.35,.23,24),cold,0,.84);
  const lens=mesh(scope,new T.CircleGeometry(.26,24),iceGlow,0,.97);lens.rotation.x=Math.PI/2;lens.castShadow=false;

  const dish=new T.Group();dish.position.set(2.15,.4,1.65);dome.add(dish);
  mesh(dish,new T.CylinderGeometry(.07,.11,2.05,10),cold,0,1.02);
  const parabola=mesh(dish,new T.ConeGeometry(.85,.38,28,1,true),metal,0,2.15);parabola.rotation.z=.9;
  mesh(dish,new T.SphereGeometry(.12,12,10),iceGlow,0,2.22).castShadow=false;

  return [{x:0,z:-10.8,radius:3.55,height:5.8}];
}

function museumLandmark(root:T.Group):Obstacle[]{
  const stone=material('#e5d2a4',.9,.03,'stone');
  const warm=material('#c5a876',.85,.04,'stone');
  const brass=material('#c69350',.4,.65,'metal');
  const dark=material('#5c4228',.9,.02,'wood');
  const glow=nightLight('#f5d088');
  const tower=new T.Group();tower.position.set(0,0,-13);root.add(tower);

  mesh(tower,new T.CylinderGeometry(2.42,2.55,.16,56),warm,0,.08);
  const water=material('#8ec0cf',.35,.25);water.polygonOffset=true;water.polygonOffsetFactor=-1;water.polygonOffsetUnits=-2;
  const moat=mesh(tower,new T.RingGeometry(1.52,2.25,56),water,0,.18);moat.rotation.x=-Math.PI/2;moat.castShadow=false;
  mesh(tower,new T.BoxGeometry(2.6,.3,2.6),stone,0,.28);
  mesh(tower,new T.BoxGeometry(2,5.6,2),stone,0,3.18);
  for(const dx of [-1,1])for(const dz of [-1,1])mesh(tower,new T.BoxGeometry(.14,5.4,.14),warm,dx*.95,3.13,dz*.95);
  mesh(tower,new T.BoxGeometry(2.2,.14,2.2),warm,0,2.23);
  mesh(tower,new T.BoxGeometry(2.2,.14,2.2),warm,0,5.83);

  const faceMat=material('#f8ecd3',.9,0);
  for(const side of [-1,1]){
    const face=mesh(tower,new T.CircleGeometry(.7,32),faceMat,0,5.13,side*1.02);face.rotation.y=side===1?0:Math.PI;
    const rim=mesh(tower,new T.TorusGeometry(.7,.045,8,48),brass,0,5.13,side*1.025);rim.rotation.y=side===1?0:Math.PI;
  }
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    mesh(tower,new T.BoxGeometry(.05,i%3===0?.14:.07,.025),dark,Math.sin(a)*.6,5.13+Math.cos(a)*.6,1.05);
  }
  const hour=mesh(tower,new T.BoxGeometry(.05,.42,.03),dark,0,5.23,1.06);hour.rotation.z=.4;
  const minute=mesh(tower,new T.BoxGeometry(.04,.56,.03),dark,0,5.21,1.07);minute.rotation.z=-.9;
  mesh(tower,new T.SphereGeometry(.06,12,8),brass,0,5.13,1.08);

  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    mesh(tower,new T.BoxGeometry(.3,1.6,.3),stone,Math.sin(a)*.75,6.83,Math.cos(a)*.75);
  }
  mesh(tower,new T.BoxGeometry(2,.2,2),warm,0,7.63);
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+Math.PI/4,geo=new T.BufferGeometry(),r=1.1;
    const apex:[number,number,number]=[0,9.43,0];
    const p0:[number,number,number]=[Math.sin(a-Math.PI/4)*r,7.73,Math.cos(a-Math.PI/4)*r];
    const p1:[number,number,number]=[Math.sin(a+Math.PI/4)*r,7.73,Math.cos(a+Math.PI/4)*r];
    geo.setAttribute('position',new T.Float32BufferAttribute([...p0,...p1,...apex],3));geo.computeVertexNormals();
    mesh(tower,geo,material('#8a4e36',.8,.1,'wood'));
  }
  mesh(tower,new T.CylinderGeometry(.05,.1,.3,8),brass,0,9.53);
  mesh(tower,new T.SphereGeometry(.18,16,12),glow,0,9.73).castShadow=false;
  mesh(tower,new T.ConeGeometry(.08,.4,8),brass,0,10.08);

  for(const x of [-2.95,2.95])tree(root,x,-13,1,'#8aa684');
  return [
    {x:0,z:-13,radius:0,halfX:1.35,halfZ:1.35,height:10.3},
    {x:-2.95,z:-13,radius:.3,height:3.8},
    {x:2.95,z:-13,radius:.3,height:3.8},
  ];
}
