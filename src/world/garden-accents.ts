import * as T from 'three';
import {material,mesh} from './architecture';
import {kit,lantern,scholarRock} from './vernacular';
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
 const glaze=kit.celadon(),stone=kit.stone(),leaf=material('#4f7d5e',.95,0,'foliage'),snow=material('#f1f5ee',.98,0,'snow');
 for(const r of catalog.regions){
  let seed=1271+r.id.length;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),routes=mountainRoutes(r),exhibits=catalog.modules.filter(m=>m.region===r.id);let count=0;
  for(let attempt=0;attempt<500&&count<6;attempt++){
   const x=(random()*2-1)*(r.radius-3.8),z=(random()*2-1)*(r.radius-3.8),wx=x+r.position[0],wz=z+r.position[1];
   if(Math.hypot(x,z)>r.radius-3.5||z>15&&r.terrain||exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<6.1)||reserved.some(p=>Math.hypot(wx-p.x,wz-p.z)<2.3)||obstacles.some(o=>overlaps(wx,wz,o,1.1)))continue;
   if(routes.length?routes.some(road=>closestRoute(x,z,road).distance<road.width/2+1.2)||landings(r).some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+1.1):onRegionRoute(x,z,r,exhibits,1.3))continue;
   const y=groundHeight(wx,wz,catalog.regions),heights=[[.65,0],[-.65,0],[0,.65],[0,-.65]].map(([dx,dz])=>groundHeight(wx+dx,wz+dz,catalog.regions));if(Math.max(...heights,y)-Math.min(...heights,y)>.14)continue;
   const g=new T.Group();g.position.set(wx,y,wz);g.rotation.y=random()*Math.PI*2;root.add(g);
   for(let i=0;i<4;i++){const a=i*2.4,rock=mesh(g,new T.DodecahedronGeometry(1,1),r.season==='winter'?snow:kit.rock(),Math.cos(a)*.45,.07,Math.sin(a)*.42);rock.scale.set(.16+i*.02,.1,.14+i*.018);rock.rotation.y=a;}
   if(count%3===0){
    // A low garden lantern among the stones.
    lantern(g,0,0,.42);
   }else if(r.season==='summer'){
    // Reeds beside a scholar's stone.
    scholarRock(g,-.15,0,.55);
    for(let i=0;i<7;i++){const reed=mesh(g,new T.CylinderGeometry(.008,.012,.55+(i%3)*.12,4),leaf,.25+Math.cos(i*2.4)*.12,.3,Math.sin(i*2.4)*.12);reed.rotation.z=(i%2?.12:-.1);}
   }else{
    // A celadon jardinière of orchid leaves, berries in autumn and winter.
    const profile=[[.15,0],[.26,.07],[.32,.33],[.33,.36],[.29,.36],[.28,.31],[.25,.09]].map(([x,y])=>new T.Vector2(x,y));mesh(g,new T.LatheGeometry(profile,20),r.season==='winter'?stone:glaze);
    mesh(g,new T.CylinderGeometry(.27,.27,.035,20),kit.soil(),0,.29);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9,stalk=new T.Group();stalk.rotation.y=a;g.add(stalk);const blade=mesh(stalk,new T.SphereGeometry(1,10,6),leaf,0,.43+i%3*.035,.13);blade.scale.set(.05,.22,.02);blade.rotation.x=.75;
     if(r.season==='autumn'||r.season==='winter')mesh(stalk,new T.SphereGeometry(.035,8,6),material(r.season==='winter'?'#b8432f':'#dcb04c'),0,.61,.2);
    }
   }
   obstacles.push({x:wx,z:wz,radius:.55,height:y+.7});entries.push({region:r.id,x:wx,y,z:wz});count++;
  }
 }
 return {entries,release:batchStatic(root)};
}

