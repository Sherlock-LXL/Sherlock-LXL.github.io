import * as T from 'three';
import {exhibitLocal} from '../../shared/exhibit-layout.mjs';
import {onRegionRoute} from '../../shared/region-routes.mjs';
import {material,mesh,softBox,tree} from './architecture';
import {flowerDrifts,type FlowerPoint} from './garden-details';
import {batchStatic} from './optimizer';
import {groundHeight} from '../../shared/terrain-height.mjs';
import {mountainRoutes,closestRoute,landings} from '../../shared/mountain-route.mjs';
import {overlaps,pointSegmentDistance} from '../../shared/navigation.mjs';
import {footprintsOverlap} from '../../shared/decoration-clearance.mjs';
import type {Catalog,Region} from '../core/types';
import type {Obstacle} from './scenery';

/** Seasonal plants occupy existing garden pockets; paths and project footprints stay clear. */
export class Seasons {
  readonly snowDrifts:{x:number;y:number;z:number;halfX:number;halfZ:number;top:number}[]=[];
  private fields:{points:T.Points;base:Float32Array;region:Region;kind:string}[]=[];private release:(()=>void)[]=[];private time=0;
  constructor(private scene:T.Scene,catalog:Catalog,obstacles:Obstacle[]){
    const sprite=document.createElement('canvas');sprite.width=sprite.height=32;const ink=sprite.getContext('2d')!;const soft=ink.createRadialGradient(16,16,1,16,16,15);soft.addColorStop(0,'#fff');soft.addColorStop(.6,'#ffffffdd');soft.addColorStop(1,'#ffffff00');ink.fillStyle=soft;ink.fillRect(0,0,32,32);const particleMap=new T.CanvasTexture(sprite);
    for(const r of catalog.regions){
      if(!r.season)continue;const root=new T.Group();root.position.set(r.position[0],0,r.position[1]);root.name=`season-${r.season}`;scene.add(root);
      const exhibits=catalog.modules.filter(m=>m.region===r.id),routes=mountainRoutes(r);let seed=1937+r.id.length;
      const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
      const height=(x:number,z:number)=>groundHeight(x+r.position[0],z+r.position[1],catalog.regions);
      const clear=(x:number,z:number,margin=.8)=>Math.hypot(x,z)<r.radius-2.4&&!(Math.abs(x)<7&&z>8)&&!exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<5.5+margin)&&!obstacles.some(o=>overlaps(x+r.position[0],z+r.position[1],o,margin))&&(routes.length?!routes.some(road=>closestRoute(x,z,road).distance<road.width/2+margin)&&!landings(r).some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+margin):!onRegionRoute(x,z,r,exhibits,margin));
      if(r.season==='spring'){
        const flowers:FlowerPoint[]=[];for(let i=0;i<1800&&flowers.length<330;i++){const x=(random()*2-1)*r.radius,z=(random()*2-1)*r.radius;if(clear(x,z,.5)){const y=height(x,z);if(Math.max(...[[.3,0],[-.3,0],[0,.3],[0,-.3]].map(([dx,dz])=>Math.abs(height(x+dx,z+dz)-y)))<.18)flowers.push({x,y:y+.06,z});}}
        root.add(flowerDrifts(flowers));
      }
      if(r.season==='summer'){
        const grass=new T.InstancedMesh(new T.ConeGeometry(.065,.22,3),material('#91b48d',1,0,'foliage'),650),pose=new T.Object3D();let blades=0;
        for(let i=0;i<4500&&blades<650;i++){const x=(random()*2-1)*(r.radius-3),z=(random()*2-1)*(r.radius-3);if(!clear(x,z,.35)||Math.hypot(x-11.2,z+2.3)<2.8)continue;pose.position.set(x,.08,z);pose.rotation.set(0,random()*6,.18);pose.scale.set(1,.5+random()*.5,1);pose.updateMatrix();grass.setMatrixAt(blades++,pose.matrix);}grass.count=blades;grass.receiveShadow=true;root.add(grass);
        // A contained lotus pool beside the studio, away from its approach and the shore rail.
        const x=11.2,z=-2.3;
        mesh(root,new T.CylinderGeometry(2.35,2.5,.28,64),material('#e6d7b8',.9,0,'stone'),x,.14,z);
        mesh(root,new T.CylinderGeometry(2.19,2.19,.035,64),new T.MeshStandardMaterial({color:'#78bab4',roughness:.3,metalness:.12}),x,.30,z);
        const rim=mesh(root,new T.TorusGeometry(2.28,.07,8,64),material('#f2e2c2',.9,0,'stone'),x,.31,z);rim.rotation.x=Math.PI/2;
        for(let i=0;i<17;i++){
          const a=i*2.4,rad=.25+Math.sqrt(i)*.42,px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;
          const leaf=mesh(root,new T.CircleGeometry(.25+(i%3)*.07,18,.12,Math.PI*2-.3),material(i%2?'#80b88e':'#a4c696',.85,0,'foliage'),px,.34+(i%2)*.016,pz);leaf.rotation.x=-Math.PI/2;leaf.rotation.z=a;leaf.castShadow=false;
          if(i%4===0){const flower=new T.Group();flower.position.set(px,.42,pz);root.add(flower);for(let n=0;n<7;n++){const t=n*Math.PI*2/7,p=mesh(flower,new T.SphereGeometry(1,8,6),material('#edb5cf',.85,0,'foliage'),Math.cos(t)*.12,.07,Math.sin(t)*.12);p.scale.set(.085,.18,.07);p.rotation.z=Math.cos(t)*.4;p.rotation.x=Math.sin(t)*.4;}mesh(flower,new T.SphereGeometry(.07,8,6),material('#e4cb86'),0,.16);}
        }
        obstacles.push({x:r.position[0]+x,z:r.position[1]+z,radius:2.4,height:.4});
        for(let i=0;i<24;i++){const a=i*2.4,rad=r.radius-1.2,x=Math.cos(a)*rad,z=Math.sin(a)*rad;if(pointSegmentDistance(x,z,0,0,-r.position[0],-r.position[1])<3)continue;const shell=mesh(root,new T.SphereGeometry(1,8,6),material('#f4e5cf',.95,0),x,.04,z);shell.scale.set(.11,.045,.15);shell.rotation.y=a;shell.castShadow=false;}
      }
      if(r.season==='autumn'){
        for(const [i,[x,z]] of [[-12,5],[12,5],[0,12],[-7,12],[7,12]].entries()){
          if(onRegionRoute(x,z,r,exhibits,1.3)||obstacles.some(o=>overlaps(x+r.position[0],z+r.position[1],o,1.2)))continue;
          tree(root,x,z,.95+i%2*.16,['#da8249','#c86447','#e4b34e'][i%3]);obstacles.push({x:x+r.position[0],z:z+r.position[1],radius:.25,height:4});
        }
        // Lobed maple leaves, instanced in drifts, replace the old wheat field.
        const shape=new T.Shape();const outline=[[0,1],[.15,.5],[.43,.68],[.36,.26],[.83,.34],[.65,.05],[1,-.12],[.45,-.27],[.47,-.53],[.1,-.38],[0,-.72],[-.1,-.38],[-.47,-.53],[-.45,-.27],[-1,-.12],[-.65,.05],[-.83,.34],[-.36,.26],[-.43,.68],[-.15,.5]];
        outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
        const leafMaterial=new T.MeshStandardMaterial({color:'#ffffff',side:T.DoubleSide,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
        const leaves=new T.InstancedMesh(new T.ShapeGeometry(shape),leafMaterial,1900),pose=new T.Object3D();let count=0;
        for(let i=0;i<11000&&count<1900;i++){const x=(random()*2-1)*(r.radius-1),z=(random()*2-1)*(r.radius-1);if(Math.hypot(x,z)>r.radius-1||exhibits.some(m=>{const p=exhibitLocal(m,x,z);return Math.abs(p.x)<4.9&&p.z>-8.9&&p.z<4;})||obstacles.some(o=>overlaps(x+r.position[0],z+r.position[1],o,.12)))continue;
          if(onRegionRoute(x,z,r,exhibits,.2)&&random()>.08)continue;
          const size=.10+random()*.13;pose.position.set(x,.06+random()*.025,z);pose.rotation.set(-Math.PI/2,0,random()*6.28);pose.scale.set(size,size,1);pose.updateMatrix();leaves.setMatrixAt(count,pose.matrix);leaves.setColorAt(count++,new T.Color(['#ce7854','#d99650','#d5aa59','#b9664b','#e6bd6b'][i%5]));}
        leaves.count=count;leaves.receiveShadow=true;root.add(leaves);
      }
      if(r.season==='winter'){
        const snow=material('#f5f7f5',1,0),bark=material('#90a3a8',.9,0,'wood');
        for(const [x,z] of [[-12,-5],[12,3],[-9,6]])if(clear(x,z,1)){
          mesh(root,new T.CylinderGeometry(.09,.17,2.7,8),bark,x,1.35,z);
          for(let i=0;i<3;i++)mesh(root,new T.ConeGeometry(1.1-i*.23,1.65,10),snow,x,1.4+i*.68,z);
          obstacles.push({x:r.position[0]+x,z:r.position[1]+z,radius:.17,height:3.7});
        }
        let snowmen=0;
        const candidates=[[-12,3.5],[8,11.5],[-11,-5],[11,8],[5,11],[-7,7],[-12,1],...Array.from({length:120},(_,i)=>[Math.cos(i*2.4)*(10+i%4),Math.sin(i*2.4)*(10+i%4)])];
        for(const [x,z] of candidates){if(snowmen>=2||!clear(x,z,1))continue;snowmen++;
          const man=new T.Group();man.name='snowman';man.position.set(x,0,z);man.rotation.y=Math.atan2(-x,7-z);root.add(man);
          mesh(man,new T.SphereGeometry(.52,20,14),snow,0,.47);mesh(man,new T.SphereGeometry(.36,20,14),snow,0,1.12);
          const coal=material('#62737c'),scarf=material('#bc8b9b',.9,0);
          for(const side of [-1,1])mesh(man,new T.SphereGeometry(.035,8,6),coal,side*.105,1.21,.325);
          const nose=mesh(man,new T.ConeGeometry(.06,.27,8),material('#d8a47a'),0,1.12,.41);nose.rotation.x=Math.PI/2;
          mesh(man,new T.CylinderGeometry(.38,.38,.12,24),scarf,0,.96);mesh(man,softBox(.12,.36,.055),scarf,.21,.79,.39);
          mesh(man,new T.CylinderGeometry(.35,.35,.045,24),coal,0,1.43);mesh(man,new T.CylinderGeometry(.22,.25,.25,24),coal,0,1.55);
          for(let i=0;i<3;i++)mesh(man,new T.SphereGeometry(.033,8,6),coal,0,.41+i*.13,.5);
          obstacles.push({x:r.position[0]+x,z:r.position[1]+z,radius:.53,height:1.7});
        }

      }
      if(r.season!=='summer'){
        const count=r.season==='spring'?160:r.season==='winter'?150:80,base=new Float32Array(count*3),positions=new Float32Array(count*3);
        for(let i=0;i<count;i++){const a=random()*Math.PI*2,d=Math.sqrt(random())*(r.radius-2),x=Math.cos(a)*d,z=Math.sin(a)*d;base.set([x,height(x,z)+1+random()*5,z],i*3);}
        positions.set(base);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
        const mat=new T.PointsMaterial({map:particleMap,color:r.season==='winter'?'#f4f8ff':r.season==='spring'?'#f7c8dc':'#e5b561',size:r.season==='winter'?.075:.1,transparent:true,opacity:.72,depthWrite:false});
        const points=new T.Points(geometry,mat);root.add(points);this.fields.push({points,base,region:r,kind:r.season});
      }
      this.release.push(batchStatic(root));
    }
  }
  /** Place shallow drifts last, once furniture, small gardens and memory plinths exist. */
  settleSnow(catalog:Catalog,obstacles:Obstacle[],reserved:{x:number;z:number}[]){
    const root=new T.Group();root.name='winter-snow-drifts';this.scene.add(root);
    const snow=material('#f5f7f5',1,0),shape=new T.SphereGeometry(1,20,12);let seed=29137;
    const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for(const r of catalog.regions.filter(r=>r.season==='winter')){
      const exhibits=catalog.modules.filter(m=>m.region===r.id);let count=0;
      for(let i=0;i<1400&&count<55;i++){
        const x=(random()*2-1)*r.radius,z=(random()*2-1)*r.radius,halfX=.38+random()*.62,halfZ=.35+random()*.6,wx=x+r.position[0],wz=z+r.position[1],radius=Math.max(halfX,halfZ),footprint={x:wx,z:wz,halfX,halfZ};
        if(Math.hypot(x,z)+radius>r.radius-3||onRegionRoute(x,z,r,exhibits,radius+.35)||exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<5.5+radius))continue;
        if(obstacles.some(o=>footprintsOverlap(footprint,o,.45))||reserved.some(p=>footprintsOverlap(footprint,{...p,radius:1.5},.25))||this.snowDrifts.some(p=>footprintsOverlap(footprint,p,.2)))continue;
        const y=groundHeight(wx,wz,catalog.regions)-.025,h=.09+random()*.07;
        const drift=mesh(root,shape,snow,wx,y,wz);drift.scale.set(halfX,h,halfZ);drift.castShadow=false;
        this.snowDrifts.push({...footprint,y,top:y+h});count++;
      }
    }
    this.release.push(batchStatic(root));
  }
  update(dt:number,reduced:boolean){this.time+=dt;for(const {points,base,kind} of this.fields){points.visible=!reduced;if(reduced)continue;const p=points.geometry.attributes.position as T.BufferAttribute;for(let i=0;i<p.count;i++){const phase=this.time*(kind==='winter'?.42:.35)+i*.73,drift=Math.sin(phase)*.55;p.setXYZ(i,base[i*3]+drift,base[i*3+1]+Math.sin(phase*.8)*.65,base[i*3+2]+Math.cos(phase*.7)*.35);}p.needsUpdate=true;}}
  dispose(){this.release.forEach(f=>f());}
}
