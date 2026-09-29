import * as T from 'three';
import {material,mesh} from './architecture';
import {groundHeight} from '../../shared/terrain-height.mjs';
import {mountainRoutes,closestRoute,landings} from '../../shared/mountain-route.mjs';
import {onRegionRoute} from '../../shared/region-routes.mjs';
import {overlaps} from '../../shared/navigation.mjs';
import {batchStatic} from './optimizer';
import type {Catalog} from '../core/types';
import type {Obstacle} from './scenery';

/** Small planted pockets, sampled after all exhibits and interactions reserve their space. */
export function gardenAccents(scene:T.Scene,catalog:Catalog,obstacles:Obstacle[],reserved:{x:number;z:number}[]=[]){
 const root=new T.Group();root.name='garden-accents';scene.add(root);const entries:{region:string;x:number;y:number;z:number}[]=[];
 const clay=material('#d6bda7',.86,0,'stone'),stone=material('#d3d3bd',.95,0,'stone'),leaf=material('#8eaf99',.95,0,'foliage'),snow=material('#f1f5ee',.98,0,'snow');
 const warm=new T.MeshStandardMaterial({color:'#eaddbe',emissive:'#f5d5a0',emissiveIntensity:.16});warm.userData.nightGlow=true;
 for(const r of catalog.regions){
  let seed=1271+r.id.length;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),routes=mountainRoutes(r),exhibits=catalog.modules.filter(m=>m.region===r.id);let count=0;
  for(let attempt=0;attempt<500&&count<6;attempt++){
   const x=(random()*2-1)*(r.radius-3.8),z=(random()*2-1)*(r.radius-3.8),wx=x+r.position[0],wz=z+r.position[1];
   if(Math.hypot(x,z)>r.radius-3.5||z>15&&r.terrain||exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<6.1)||reserved.some(p=>Math.hypot(wx-p.x,wz-p.z)<2.3)||obstacles.some(o=>overlaps(wx,wz,o,1.1)))continue;
   if(routes.length?routes.some(road=>closestRoute(x,z,road).distance<road.width/2+1.2)||landings(r).some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+1.1):onRegionRoute(x,z,r,exhibits,1.3))continue;
   const y=groundHeight(wx,wz,catalog.regions),heights=[[.65,0],[-.65,0],[0,.65],[0,-.65]].map(([dx,dz])=>groundHeight(wx+dx,wz+dz,catalog.regions));if(Math.max(...heights,y)-Math.min(...heights,y)>.14)continue;
   const g=new T.Group();g.position.set(wx,y,wz);g.rotation.y=random()*Math.PI*2;root.add(g);
   for(let i=0;i<4;i++){const a=i*2.4,rock=mesh(g,new T.SphereGeometry(1,14,10),r.season==='winter'?snow:stone,Math.cos(a)*.45,.09,Math.sin(a)*.42);rock.scale.set(.16+i*.02,.09,.14+i*.018);}
   if(count%3===0){
    mesh(g,new T.CylinderGeometry(.21,.28,.12,20),clay,0,.06);mesh(g,new T.CylinderGeometry(.17,.19,.36,20),warm,0,.29);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(g,new T.CylinderGeometry(.015,.015,.37,6),clay,Math.cos(a)*.2,.29,Math.sin(a)*.2);}
    const cap=mesh(g,new T.SphereGeometry(.25,20,12,0,Math.PI*2,0,Math.PI/2),clay,0,.49);cap.scale.y=.45;
   }else if(r.season==='summer'){
    const wood=material('#c9ad87',.92,0,'wood'),drift=mesh(g,new T.CapsuleGeometry(.065,.7,5,12),wood,0,.12,0);drift.rotation.set(0,0,1.3);
    for(let i=0;i<3;i++){const shell=mesh(g,new T.SphereGeometry(1,20,12),material(i%2?'#efcbbf':'#f3e8d6'),-.3+i*.25,.09,.28);shell.scale.set(.12,.045,.09);for(let j=0;j<3;j++){const ridge=mesh(shell,new T.TorusGeometry(.6+j*.12,.025,4,16,Math.PI),clay);ridge.rotation.x=Math.PI/2;ridge.position.y=.7;}}
   }else{
    const profile=[[.15,0],[.26,.07],[.32,.33],[.33,.36],[.29,.36],[.28,.31],[.25,.09]].map(([x,y])=>new T.Vector2(x,y));mesh(g,new T.LatheGeometry(profile,28),r.season==='winter'?snow:clay);
    mesh(g,new T.CylinderGeometry(.27,.27,.035,24),material('#879885',1,0),0,.29);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9,stalk=new T.Group();stalk.rotation.y=a;g.add(stalk);const blade=mesh(stalk,new T.SphereGeometry(1,12,8),leaf,0,.43+i%3*.035,.13);blade.scale.set(.065,.2,.025);blade.rotation.x=.65;
     if(r.season==='autumn'||r.season==='winter')mesh(stalk,new T.SphereGeometry(.035,10,8),material(r.season==='winter'?'#c78f88':'#d5aa63'),0,.61,.2);
    }
   }
   obstacles.push({x:wx,z:wz,radius:.55,height:y+.7});entries.push({region:r.id,x:wx,y,z:wz});count++;
  }
 }
 return {entries,release:batchStatic(root)};
}
