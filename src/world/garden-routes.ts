import {railRuns} from '../../shared/rail-runs.mjs';
import * as T from 'three';
import {onRegionRoute} from '../../shared/region-routes.mjs';
import {mountainRoutes,closestRoute,landings} from '../../shared/mountain-route.mjs';
import {groundHeight,regionHeight} from '../../shared/terrain-height.mjs';
import {walkable} from '../../shared/navigation.mjs';
import {footprintsOverlap} from '../../shared/decoration-clearance.mjs';
import {memoryEntries} from '../../shared/memories.mjs';
import {material,mesh,softBox} from './architecture';
import type {Obstacle} from './scenery';
import {flowerDrifts,type FlowerPoint} from './garden-details';
import {batchStatic} from './optimizer';
import type {Catalog} from '../core/types';

export function buildGardenRoutes(scene:T.Scene,catalog:Catalog,obstacles:Obstacle[]){
  const group=new T.Group();group.name='mountain-garden';scene.add(group);
  const rails:{x:number;y:number;z:number}[][]=[];const flowers:FlowerPoint[]=[],roads:{kind:string;points:{x:number;y:number;z:number}[];width:number}[]=[];
  const benches:{x:number;y:number;z:number;halfX:number;halfZ:number}[]=[],walls:{x:number;z:number;halfX:number;halfZ:number}[]=[],memories:{x:number;z:number}[]=memoryEntries(catalog);
  const stone=material('#d7c9af',.95,.02,'stone'),wood=material('#a5b6a1',.8,.02,'wood'),cap=material('#e8dfc9',.9,.02,'stone');
  const glow=new T.MeshStandardMaterial({color:'#f1deaf',emissive:'#efd09a',emissiveIntensity:.12});glow.userData.nightGlow=true;
  const beam=(a:T.Vector3,b:T.Vector3,r:number,mat:T.Material)=>{const delta=b.clone().sub(a),part=mesh(group,new T.CylinderGeometry(r,r,delta.length(),8),mat,...a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number]);part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return part;};
  for(const region of catalog.regions){
    const prepared=mountainRoutes(region);if(!prepared.length)continue;
    const plazas=landings(region),rx=region.position[0],rz=region.position[1];
    for(const route of prepared){
      const points=route.points.map(p=>({...p,x:p.x+rx,z:p.z+rz}));roads.push({kind:route.kind,points,width:route.width});
      // Road colour is painted on mountainSurface; no overlapping ribbon geometry.
      if(route.kind==='shortcut')for(const reverse of [false,true]){
        const p=points[reverse?points.length-1:0],q=points[reverse?Math.max(0,points.length-7):Math.min(6,points.length-1)],dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz)||1;
        for(let n=0;n<3;n++){const x=p.x+dx/d*(.5+n*.5),z=p.z+dz/d*(.5+n*.5);for(const side of [-1,1]){const stroke=mesh(group,new T.BoxGeometry(.055,.027,.42),glow,x+dz/d*side*.13,groundHeight(x,z,catalog.regions)+.2,z-dx/d*side*.13);stroke.rotation.y=Math.atan2(dx,dz)+side*.65;stroke.castShadow=false;}}
      }
      let accumulated=0;const samples:number[]=[0];for(let i=1;i<points.length;i++){accumulated+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);if(accumulated>=1.4){samples.push(i);accumulated=0;}}
      for(const side of [-1,1]){
        const candidates=samples.map((i,j)=>{
          const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],p=points[i],d=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=-(b.z-a.z)/d*side,nz=(b.x-a.x)/d*side,offset=route.width/2+.4,x=p.x+nx*offset,z=p.z+nz*offset;
          const inPlaza=plazas.some(q=>Math.hypot(x-rx-q.x,z-rz-q.z)<q.radius+.65);
          const junction=prepared.some(other=>other!==route&&closestRoute(x-rx,z-rz,other).distance<other.width/2+.8);
          if(inPlaza||junction||onRegionRoute(x-rx,z-rz,region,[],.8)||closestRoute(x-rx,z-rz,route).distance<route.width/2+.24||!walkable(x,z,catalog.regions,obstacles))return null;
          const y=groundHeight(x,z,catalog.regions);
          const rim=Array.from({length:8},(_,n)=>groundHeight(x+Math.cos(n*Math.PI/4)*.13,z+Math.sin(n*Math.PI/4)*.13,catalog.regions));
          if(Math.max(...rim)-Math.min(...rim)>.65)return null;
          return {x,z,y:Math.max(y,...rim,groundHeight(p.x,p.z,catalog.regions)),rootY:Math.min(y,...rim)-.045,j,a,b,p,d,nx,nz};
        });
        for(const run of railRuns(candidates,(a,b)=>{
          const length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(length/.1),nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;
          for(let n=0;n<=count;n++)for(const side of [-.09,0,.09]){
            const t=n/count,x=a.x+(b.x-a.x)*t+nx*side,z=a.z+(b.z-a.z)*t+nz*side;
            if(groundHeight(x,z,catalog.regions)>a.y+(b.y-a.y)*t+.24)return false;
          }
          return true;
        })){
         rails.push(run.map(({x,y,z})=>({x,y,z})));let previous:T.Vector3|null=null;
         for(const {x,z,y,rootY,j,a,b,p,d,nx,nz} of run){
          const foot=new T.Vector3(x,y,z);
          mesh(group,new T.CylinderGeometry(.065,.085,y+1.2-rootY,8),wood,x,(y+1.2+rootY)/2,z);mesh(group,new T.SphereGeometry(.108,10,8),cap,x,y+1.22,z);
          if(j%4===0){const light=mesh(group,new T.SphereGeometry(.09,10,8),glow,x,y+1.32,z);light.castShadow=false;}
          if(previous&&previous.distanceTo(foot)<2.8){
            for(const h of [.5,1.08])beam(previous.clone().add(new T.Vector3(0,h,0)),foot.clone().add(new T.Vector3(0,h,0)),h>.6?.052:.032,wood);
            obstacles.push({x:(x+previous.x)/2,z:(z+previous.z)/2,radius:.065,height:Math.min(y,previous.y)+1.2,segment:[previous.x,previous.z,x,z]});
          }
          previous=foot;
          if(j%2===0){
            const fx=p.x+nx*(route.width/2+.2),fz=p.z+nz*(route.width/2+.2);
            // Flowers root individually into gentle ground; rigid soil boxes
            // bridged the summit's changing slope and cut into its surface.
            for(let k=0;k<4;k++){const px=fx+(b.x-a.x)/d*(k-1.5)*.22,pz=fz+(b.z-a.z)/d*(k-1.5)*.22,py=groundHeight(px,pz,catalog.regions);if(py>11.5)continue;
              const around=[[.2,0],[-.2,0],[0,.2],[0,-.2]].map(([dx,dz])=>groundHeight(px+dx,pz+dz,catalog.regions));if(Math.max(...around)-Math.min(...around)>.15)continue;
              flowers.push({x:px,y:py+.035,z:pz});}

          }
        }
       }
      }
    }
    for(const [i,p] of plazas.entries()){
      const x=rx+p.x,z=rz+p.z;
      // Side openings stay free for F consoles and memory markers.
      if(i===1||i===3){
        const candidates=[[x,z+2.55],...[3.2,4.2,5.2].flatMap(d=>Array.from({length:32},(_,n)=>[x+Math.cos(n*Math.PI/16)*d,z+Math.sin(n*Math.PI/16)*d]))];
        for(const [bx,bz] of candidates){
          const footprint={x:bx,z:bz,halfX:.99,halfZ:.42},by=groundHeight(bx,bz,catalog.regions);
          if(Math.abs(by-p.y)>.18||Math.hypot(bx-rx,bz-rz)>region.radius-3||obstacles.some(o=>footprintsOverlap(footprint,o,.38))||memories.some(m=>Math.hypot(bx-m.x,bz-m.z)<2.2))continue;
          if(prepared.some(r=>closestRoute(bx-rx,bz-rz,r).distance<r.width/2+1.25))continue;
          const heights=[[-.95,-.4],[-.95,.4],[.95,-.4],[.95,.4],[0,0]].map(([dx,dz])=>groundHeight(bx+dx,bz+dz,catalog.regions));
          if(Math.max(...heights)-Math.min(...heights)>.12)continue;
          const floor=Math.max(...heights);mesh(group,softBox(1.9,.13,.6),material('#c5ad8d',.8,.02,'wood'),bx,floor+.56,bz);mesh(group,softBox(1.9,.5,.1),wood,bx,floor+.86,bz+.28);
          for(const side of [-1,1]){const foot=groundHeight(bx+side*.7,bz,catalog.regions),h=floor+.52-foot;mesh(group,softBox(.13,h,.48),stone,bx+side*.7,foot+h/2,bz);}
          obstacles.push({...footprint,radius:0,height:floor+1.15});benches.push({...footprint,y:floor});break;
        }
      }
    }
    // Retaining masonry gives each flat exhibition terrace a readable architectural edge.
    for(const terrace of region.terrain!.terraces){
      const [cx,cz]=terrace.center;
      for(const side of [-1,1])for(let n=0;n<7;n++){
        const x=cx+side*5.65,z=cz-4.8+n*1.35;if(prepared.some(r=>closestRoute(x,z,r).distance<r.width/2+1))continue;
        const corners=[[-.3,-.8],[-.3,.8],[.3,-.8],[.3,.8]];
        if(corners.some(([dx,dz])=>Math.hypot(x+dx,z+dz)>region.radius-2))continue;
        const supports=corners.map(([dx,dz])=>regionHeight(x+dx,z+dz,region));
        const low=Math.min(...supports)-.18,high=Math.min(terrace.height,Math.max(...supports))+.12;
        // A retaining edge must sit within this patch of earth, not reach up to a
        // distant terrace level and project unsupported above the island rim.
        if(high-low<.12||high-low>1.5)continue;
        const h=high-low,base=low;
        const footprint={x:rx+x,z:rz+z,halfX:.265,halfZ:.675};
        if(obstacles.some(o=>footprintsOverlap(footprint,o,.22))||memories.some(m=>Math.hypot(m.x-footprint.x,m.z-footprint.z)<1.3))continue;
        const wall=mesh(group,new T.BoxGeometry(.36,h,1.33),stone,rx+x,base+h/2,rz+z);wall.name='terrace-retaining-wall';mesh(group,new T.BoxGeometry(.53,.14,1.35),cap,rx+x,high+.05,rz+z);
        obstacles.push({...footprint,radius:0,height:high+.12});walls.push(footprint);
      }
    }
  }
  group.add(flowerDrifts(flowers));const release=batchStatic(group);return {roads,rails,benches,walls,flowerCount:flowers.length,flowerRoots:flowers,release};
}
