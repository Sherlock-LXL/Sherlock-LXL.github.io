import * as T from 'three';
import {discoveryScore} from '../../shared/discovery-focus.mjs';
import {memoryEntries,growthEntries,starPosition} from '../../shared/memories.mjs';
import {mountainRoutes} from '../../shared/mountain-route.mjs';
import {groundHeight} from '../../shared/terrain-height.mjs';
import {hillsidePath} from './mountain';
import {findTrail} from '../../shared/trail.mjs';
import {walkable} from '../../shared/navigation.mjs';
import {material,mesh} from './architecture';
import {sign,type Obstacle} from './scenery';
import {batchStatic} from './optimizer';
import type {Catalog,MemoryFragment} from '../core/types';
import type {EventBus} from '../core/events';

export class Memories {
  readonly entries:MemoryFragment[];
  readonly trailPaths:number[]=[];
  readonly shortcutPaths:{x:number;z:number}[][]=[];
  private nearby:MemoryFragment|'constellation'|null=null;
  private stars=new Map<string,{ground:T.Mesh;sky:T.Mesh}>();private elapsed=0;private release:(()=>void)[]=[];
  private target:T.Mesh;targetId:string|null=null;private sparks:T.Points;
  constructor(scene:T.Scene,private catalog:Catalog,private obstacles:Obstacle[],private bus:EventBus,private found:ReadonlySet<string>){
    this.entries=memoryEntries(catalog) as MemoryFragment[];
    const frames=new T.Group();scene.add(frames);
    const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;
    const ink=glowCanvas.getContext('2d')!,gradient=ink.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#fff2c6bb');gradient.addColorStop(.2,'#ffe4a555');gradient.addColorStop(1,'#ffe4a500');ink.fillStyle=gradient;ink.fillRect(0,0,64,64);
    const haloMap=new T.CanvasTexture(glowCanvas);this.release.push(()=>haloMap.dispose());
    this.entries.forEach((entry,i)=>{
      const safe=this.safePoint(entry.x,entry.z);entry.x=safe.x;entry.z=safe.z;
      const group=new T.Group();group.position.set(entry.x,groundHeight(entry.x,entry.z,catalog.regions),entry.z);frames.add(group);
      const h=.12+(entry.growth?entry.growth.order/100:0);
      mesh(group,new T.CylinderGeometry(.48,.58,.16,8),material('#d7d1c2',.9,0,'stone'),0,.08);
      mesh(group,new T.CylinderGeometry(.29,.4,.63,6),material('#c3c9bf',.85,.04,'stone'),0,.47);
      mesh(group,new T.CylinderGeometry(.4,.32,.09,6),material('#eee4d0'),0,.82);
      const ring=mesh(group,new T.TorusGeometry(.29,.018,6,36),new T.MeshBasicMaterial({color:entry.color}),0,.88);ring.rotation.x=Math.PI/2;
      const ground=mesh(scene,new T.OctahedronGeometry(.23,0),new T.MeshBasicMaterial({color:'#f9dfa2'}),entry.x,groundHeight(entry.x,entry.z,catalog.regions)+1.22+h,entry.z);ground.scale.set(.72,1.65,.72);ground.castShadow=false;ground.name='starlight-shard';
      const halo=new T.Sprite(new T.SpriteMaterial({map:haloMap,transparent:true,opacity:.52,depthWrite:false}));halo.name='memory-soft-halo';halo.scale.set(1.6/.72,1.6/1.65,1);ground.add(halo);ground.userData.energy=found.has(entry.id)?0:1;
      const star=starPosition(entry.id,this.entries),sky=mesh(scene,new T.SphereGeometry(.075,10,8),new T.MeshBasicMaterial({color:'#ffe5b0'}),(star.x-100)/27,6.3+(95-star.y)/65,(star.y-95)/30);sky.castShadow=false;
      ground.userData.baseY=ground.position.y;ground.userData.phase=i;this.stars.set(entry.id,{ground,sky});
    });
    const sparkGeometry=new T.BufferGeometry();sparkGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(this.entries.length*12*3),3));sparkGeometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(this.entries.length*12*3).fill(1),3));this.sparks=new T.Points(sparkGeometry,new T.PointsMaterial({color:'#ffebc0',vertexColors:true,size:.045,transparent:true,opacity:.7,depthWrite:false}));this.sparks.frustumCulled=false;scene.add(this.sparks);
    // Fade particles away rather than turning them into dark flecks on snow.
    (this.sparks.material as T.PointsMaterial).onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','diffuseColor.a *= vColor.r;');};
    (this.sparks.material as T.PointsMaterial).customProgramCacheKey=()=> 'memory-spark-opacity-v1';
    const atlas=new T.Group();atlas.position.set(0,0,4.55);frames.add(atlas);
    mesh(atlas,new T.CylinderGeometry(.65,.83,.22,32),material('#e5dccb',.85,0,'stone'),0,.11);
    mesh(atlas,new T.CylinderGeometry(.44,.62,.6,12),material('#afc5ca'),0,.52);
    const constellation=[[-.55,1.25,0],[-.22,1.58,.12],[.18,1.47,-.12],[.48,1.86,.06],[.7,1.52,.08]],starlight=new T.MeshBasicMaterial({color:'#e8d6fa'}),segments:number[]=[];
    constellation.forEach((p,i)=>{mesh(atlas,new T.OctahedronGeometry(.09,0),starlight,...p as [number,number,number]);if(i)segments.push(...constellation[i-1],...p);});
    const chart=new T.BufferGeometry();chart.setAttribute('position',new T.Float32BufferAttribute(segments,3));atlas.add(new T.LineSegments(chart,new T.LineBasicMaterial({color:'#badfe5',transparent:true,opacity:.8})));
    obstacles.push({x:0,z:4.55,radius:.65,height:1.85});
    const orbit=mesh(frames,new T.TorusGeometry(3.1,.018,6,96),material('#b9c9ba'),0,6.3);orbit.rotation.x=Math.PI/2;
    const lines:number[]=[],ordered=growthEntries(this.entries) as MemoryFragment[];
    for(let i=1;i<this.entries.length;i++){
      const a=this.stars.get(this.entries[i-1].id)!.sky.position,b=this.stars.get(this.entries[i].id)!.sky.position;lines.push(...a.toArray(),...b.toArray());
    }
    const network=new T.BufferGeometry();network.setAttribute('position',new T.Float32BufferAttribute(lines,3));scene.add(new T.LineSegments(network,new T.LineBasicMaterial({color:'#bcc9c2',transparent:true,opacity:.4})));
    const dots:number[]=[];
    const pathLight=new T.MeshStandardMaterial({color:'#f3e5bb',emissive:'#efd49c',emissiveIntensity:.12});pathLight.userData.nightGlow=true;
    const finishPath=(path:{x:number;z:number}[])=>{for(let i=3;i<path.length;i+=9){const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.z-a.z);if(d<.1)continue;const x=b.x-(b.z-a.z)/d*.95,z=b.z+(b.x-a.x)/d*.95;if(!walkable(x,z,catalog.regions,obstacles))continue;const y=groundHeight(x,z,catalog.regions);mesh(frames,new T.CylinderGeometry(.06,.09,.55,8),material('#a6b5a2'),x,y+.275,z);const lamp=mesh(frames,new T.SphereGeometry(.12,10,8),pathLight,x,y+.61,z);lamp.castShadow=false;}};
    for(let i=1;i<ordered.length;i++){
      if(ordered[i].regionId!==ordered[i-1].regionId)continue;
      const path=findTrail(ordered[i-1],ordered[i],catalog.regions,obstacles);
      this.trailPaths.push(path.length);
      if(!catalog.regions.find(r=>r.id===ordered[i].regionId)?.terrain?.route)path.forEach(p=>dots.push(p.x,groundHeight(p.x,p.z,catalog.regions)+.085,p.z));
      if(catalog.regions.find(r=>r.id===ordered[i].regionId)?.terrain&&!catalog.regions.find(r=>r.id===ordered[i].regionId)?.terrain?.route){scene.add(hillsidePath(path,catalog.regions,'#e8d8b6'));finishPath(path);}
    }
    for(const region of catalog.regions.filter(r=>r.terrain&&!r.terrain.route)){
      const first=ordered.find(e=>e.regionId===region.id);if(!first)continue;
      const spawn={x:region.position[0]+(region.spawn?.[0]??0),z:region.position[1]+(region.spawn?.[1]??10)},distance=Math.hypot(...region.position);
      const landing={x:region.position[0]*(1-(region.radius-1)/distance),z:region.position[1]*(1-(region.radius-1)/distance)};
      const approach=[...findTrail(landing,spawn,catalog.regions,obstacles),...findTrail(spawn,first,catalog.regions,obstacles)];
      scene.add(hillsidePath(approach,catalog.regions,'#e8d8b6'));finishPath(approach);
    }
    for(const region of catalog.regions)for(const shortcut of region.terrain?.shortcuts??[]){
      if(region.terrain?.route&&shortcut.profile){const authored=mountainRoutes(region).find(r=>r.name===shortcut.title);this.shortcutPaths.push(authored?.points.map(p=>({x:p.x+region.position[0],z:p.z+region.position[1]}))??[]);continue;}
      const route:{x:number;z:number}[]=[];const waypoints=shortcut.points.map(([x,z])=>({x:x+region.position[0],z:z+region.position[1]}));
      for(let i=1;i<waypoints.length;i++){const leg=findTrail(waypoints[i-1],waypoints[i],catalog.regions,obstacles);if(!leg.length){route.length=0;break;}route.push(...leg);}
      this.shortcutPaths.push(route);if(route.length){scene.add(hillsidePath(route,catalog.regions,'#b7cdda',1));for(const point of [route[0],route[route.length-1]]){const marker=sign(frames,shortcut.title,'VISION SHORTCUT · 双向山径','#8db5c3',2.8,.72);marker.position.set(point.x,groundHeight(point.x,point.z,catalog.regions)+1.4,point.z+.5);}}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(dots,3));
    const trail=new T.Points(geometry,new T.PointsMaterial({color:'#dfba77',size:.105,sizeAttenuation:true}));trail.name='growth-trail';scene.add(trail);
    this.target=mesh(scene,new T.TorusGeometry(.76,.035,6,48),new T.MeshBasicMaterial({color:'#ffdf97'}));this.target.rotation.x=-Math.PI/2;this.target.castShadow=false;this.target.visible=false;
    this.release.push(batchStatic(frames));
  }
  private safePoint(x:number,z:number){
    if(walkable(x,z,this.catalog.regions,this.obstacles))return {x,z};
    for(let r=.4;r<=4;r+=.4)for(let i=0;i<24;i++){const p={x:x+Math.cos(i*Math.PI/12)*r,z:z+Math.sin(i*Math.PI/12)*r};if(walkable(p.x,p.z,this.catalog.regions,this.obstacles))return p;}
    return {x,z};
  }
  location(id:string){return this.entries.find(e=>e.id===id);}
  track(id:string|null){this.targetId=id;}
  candidate(x:number,z:number,heading?:{x:number;z:number}){
    let target:MemoryFragment|'constellation'|null=null,score=-Infinity;
    const atlas=discoveryScore(x,z,0,4.55,2.25,heading);if(atlas>score){target='constellation';score=atlas;}
    for(const entry of this.entries){const value=discoveryScore(x,z,entry.x,entry.z,2.05,heading);if(value>score){target=entry;score=value;}}
    return {target,score};
  }
  interact(){if(!this.nearby)return false;if(this.nearby==='constellation')this.bus.emit('constellation',undefined);else this.bus.emit('memory',this.nearby);return true;}
  update(dt:number,x:number,z:number,available:boolean,reduced:boolean,heading?:{x:number;z:number}){
    this.elapsed+=dt;const next=available?this.candidate(x,z,heading).target:null;
    if(next!==this.nearby){this.nearby=next;this.bus.emit('memoryNearby',next);}
    this.stars.forEach(({ground,sky},id)=>{const target=this.found.has(id)?0:1;ground.userData.energy+=(target-ground.userData.energy)*(reduced?1:1-Math.exp(-dt*4));const energy=ground.userData.energy;
      (ground.material as T.MeshBasicMaterial).color.set('#698f86').lerp(new T.Color('#fff0be'),energy);(sky.material as T.MeshBasicMaterial).color.set('#789496').lerp(new T.Color('#ffe6b5'),energy);sky.scale.setScalar(.8+energy*.7);
      (ground.getObjectByName('memory-soft-halo') as T.Sprite).material.opacity=.07+energy*.45;ground.position.y=ground.userData.baseY+(reduced?0:Math.sin(this.elapsed*1.2+ground.userData.phase)*.055);});
    const points=this.sparks.geometry.attributes.position as T.BufferAttribute;let n=0;
    const sparkColors=this.sparks.geometry.attributes.color as T.BufferAttribute;
    this.stars.forEach(({ground})=>{ground.rotation.y=reduced?0:this.elapsed*.35;for(let k=0;k<12;k++){const a=k*Math.PI/6+(reduced?0:this.elapsed*.45),r=.36+(k%3)*.035,e=.16+ground.userData.energy*.84;sparkColors.setXYZ(n,e,e,e);points.setXYZ(n++,ground.position.x+Math.cos(a)*r,ground.position.y+Math.sin(a*2+k)*.22,ground.position.z+Math.sin(a)*r);}});points.needsUpdate=true;sparkColors.needsUpdate=true;
    const target=this.entries.find(e=>e.id===this.targetId);this.target.visible=!!target;if(target)this.target.position.set(target.x,groundHeight(target.x,target.z,this.catalog.regions)+.09,target.z);
  }
  dispose(){this.release.forEach(f=>f());}
}
