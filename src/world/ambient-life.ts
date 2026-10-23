import * as T from 'three';
import {batchStatic} from './optimizer';
import {buildBoat,type VesselKind} from './boats';
import {flightOpacity,birdDaylight,chooseFishRoute} from '../../shared/ambient-routes.mjs';
import type {Region} from '../core/types';

const SEA_Y=-5.65;
type BirdKind='swallow'|'gull'|'crane';
type WingedBird=T.Group&{userData:{wings?:T.Group[]}};
type Flyby={root:T.Group;birds:WingedBird[];materials:T.Material[];alpha:number;path:T.CatmullRomCurve3;cooldown:number;progress:number;duration:number;reverse:boolean};
type LeapingFish={root:T.Group;splashes:T.Mesh[];splashAge:number[];spot:T.Vector2;cooldown:number;progress:number;duration:number;height:number;travel:number;angle:number};
type Vessel={root:T.Group;radius:number;zScale:number;angle:number;speed:number;direction:number};

const material=(color:string,roughness=.84)=>new T.MeshStandardMaterial({color,roughness,metalness:.02,flatShading:true});
const place=(parent:T.Object3D,geometry:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0)=>{
  const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);return mesh;
};
const triangle=(points:number[])=>{const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));const indices:number[]=[];for(let i=1;i<points.length/3-1;i++)indices.push(0,i,i+1);geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;};

function bird(kind:BirdKind,perched=false):WingedBird{
  const root=new T.Group() as WingedBird;root.name=`${perched?'perched':'flying'}-${kind}`;root.userData.dynamic=true;
  const colors=kind==='swallow'?['#253b42','#4f7376','#e4d6bd','#c79a56']:kind==='gull'?['#eee9dc','#85939a','#fbf5e7','#c4a34d']:['#f0ede2','#273c42','#ded9ca','#b44b36'];
  const bodyY=perched?.24:0,body=place(root,new T.SphereGeometry(1,14,9),material(colors[0]),0,bodyY,0);
  body.scale.set(kind==='crane'?.14:.16,kind==='crane'?.14:.145,kind==='crane'?.54:.4);
  const chest=place(root,new T.SphereGeometry(1,12,8),material(colors[2]),0,bodyY-.035,.17);chest.scale.set(kind==='crane'?.105:.12,.105,.23);
  const head=place(root,new T.SphereGeometry(kind==='crane'?.12:.135,12,8),material(kind==='crane'?colors[3]:colors[0]),0,bodyY+.055,.37);
  if(kind==='crane'){
    const neck=place(root,new T.CylinderGeometry(.036,.052,.42,8),material(colors[0]),0,bodyY+.16,.28);neck.rotation.x=-.43;
    head.position.set(0,bodyY+.34,.48);
    for(const side of [-1,1]){const leg=place(root,new T.CylinderGeometry(.012,.016,.42,5),material('#7d6045'),side*.045,bodyY-.08,-.38);leg.rotation.x=Math.PI/2-.2;}
  }
  const eyeMaterial=material('#171b1b',.65);
  for(const side of [-1,1])place(root,new T.SphereGeometry(.018,7,5),eyeMaterial,side*(kind==='crane'?.075:.09),head.position.y+.025,head.position.z+.095);
  const beak=place(root,new T.ConeGeometry(kind==='crane'?.032:.04,kind==='crane'?.28:.18,6),material(colors[3]),0,head.position.y,head.position.z+(kind==='crane'?.18:.16));beak.rotation.x=Math.PI/2;
  const wingMaterial=material(colors[1]),featherMaterial=material(kind==='gull'?'#5f737b':'#21343a');wingMaterial.side=featherMaterial.side=T.DoubleSide;
  const spread=perched?.34:kind==='crane'?1.02:.76,wings:[T.Group,T.Group]=[-1,1].map(side=>{
    const wing=new T.Group();wing.position.y=bodyY+.035;wing.userData.dynamic=true;root.add(wing);
    place(wing,triangle([0,0,.15,side*.4,.018,.05,side*spread,0,-.08,side*.28,0,-.38]),wingMaterial);
    if(!perched)for(let i=0;i<3;i++){
      const base=.28+i*.13,tip=Math.min(spread,.63+i*.13);
      place(wing,triangle([side*base,.006,-.08,side*tip,0,-.17-i*.035,side*(base+.08),0,-.42+i*.035]),featherMaterial);
    }
    wing.rotation.z=perched?side*.52:0;return wing;
  }) as [T.Group,T.Group];
  root.userData.wings=wings;
  const tailMaterial=material(colors[1]);tailMaterial.side=T.DoubleSide;
  const tailLength=kind==='swallow'?.68:kind==='crane'?.52:.4;
  for(const side of [-1,1])place(root,triangle([0,0,-.2,side*(kind==='swallow'?.23:.16),0,-tailLength,side*.035,0,-tailLength+.1]),tailMaterial,0,bodyY,0);
  if(perched){
    const legMaterial=material(kind==='crane'?'#7b5a3d':'#9a7442');
    for(const side of [-1,1]){place(root,new T.CylinderGeometry(.012,.015,.2,5),legMaterial,side*.05,.11,.02);place(root,new T.BoxGeometry(.11,.018,.018),legMaterial,side*.065,.008,.05);}
  }
  root.scale.setScalar(kind==='crane'?1.42:1.08);return root;
}

function flap(entry:WingedBird,time:number,amount=1){
  const wings=entry.userData.wings;if(!wings)return;
  const angle=Math.sin(time)*.72*amount;
  wings[0].rotation.z=-angle;wings[1].rotation.z=angle;
}

function fish(color:string){
  const root=new T.Group();root.name='leaping-fish';root.userData.dynamic=true;
  // Streamlined body, silver belly, gills and a vertical forked tail.
  const profile=[[-.53,.025],[-.39,.07],[-.2,.16],[.06,.205],[.3,.17],[.46,.11],[.54,.035],[.55,0]];
  const geometry=new T.LatheGeometry(profile.map(([z,r])=>new T.Vector2(r,z)),20);
  geometry.rotateX(Math.PI/2);geometry.scale(.68,1,1);
  const colors:number[]=[],back=new T.Color(color),belly=new T.Color('#f3e9d1'),tone=new T.Color();
  for(let i=0;i<geometry.attributes.position.count;i++){const y=geometry.attributes.position.getY(i);tone.copy(back).lerp(belly,T.MathUtils.smoothstep(-y,-.06,.15));colors.push(tone.r,tone.g,tone.b);}
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  place(root,geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.12}));
  const finMaterial=material('#d9b68b',.66);finMaterial.side=T.DoubleSide;
  const tail=new T.Group();tail.position.z=-.48;tail.userData.dynamic=true;root.add(tail);root.userData.tail=tail;
  place(tail,triangle([0,0,0,0,.27,-.35,0,.07,-.26,0,0,-.16]),finMaterial);
  place(tail,triangle([0,0,0,0,-.27,-.35,0,-.07,-.26,0,0,-.16]),finMaterial);
  place(root,triangle([0,.12,.14,0,.34,-.09,0,.12,-.31]),finMaterial);
  for(const side of [-1,1]){
    place(root,triangle([side*.09,-.02,.15,side*.31,-.13,-.09,side*.09,-.07,-.15]),finMaterial);
    place(root,new T.SphereGeometry(.035,10,8),material('#f2d6a2'),side*.078,.057,.428);
    place(root,new T.SphereGeometry(.022,9,7),material('#1d3940'),side*.099,.06,.432);
    const gill=new T.CatmullRomCurve3([new T.Vector3(side*.103,.108,.26),new T.Vector3(side*.123,0,.21),new T.Vector3(side*.096,-.12,.25)]);
    place(root,new T.TubeGeometry(gill,10,.006,4,false),material('#507e81'));
  }
  root.scale.setScalar(1.18);
  return root;
}

/** Sparse, deterministic wildlife and traffic. Every route has a structural clearance from land and other traffic. */
export class AmbientLife{
  private root=new T.Group();private random:()=>number;
  private flybys:Flyby[]=[];private perched:WingedBird[]=[];private fish:LeapingFish[]=[];private vessels:Vessel[]=[];
  private releases:(()=>void)[]=[];
  private elapsed=0;
  constructor(scene:T.Scene,private regions:Region[]){
    this.root.name='ambient-life';scene.add(this.root);
    let seed=48151623;this.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    this.addFlyby('swallow',5,[[-155,30,-72],[-68,28,-48],[25,32,54],[155,31,78]],.4);
    this.addFlyby('gull',3,[[142,38,-112],[58,36,-62],[-38,39,18],[-155,37,92]],7);
    this.addFlyby('crane',2,[[-150,46,118],[-52,44,92],[45,47,104],[160,45,62]],15);
    this.addPerched('gull',3.52,-3.48,28.6,-Math.PI/2,.86);
    this.addPerched('gull',-3.52,-3.48,28.6,Math.PI/2,.82);
    this.addPerched('swallow',26.05,5.1,-28.42,Math.PI,.72);
    ['#599f9a','#77a7bc','#d9a06f','#578d9a'].forEach((color,i)=>this.addFish(color,2+i*3));
    // Three nested rings stay inside the future-island belt and outside the fish water.
    for(const [kind,r,phase,speed,direction] of [['sampan',88,.15,.014,1],['junk',95,2.45,.011,-1],['fishing',102,4.7,.009,1]] as [VesselKind,number,number,number,number][]){
      const zScale=1;
      const root=buildBoat(kind);root.name=`passing-${kind}`;root.scale.setScalar(kind==='junk'?1.55:kind==='fishing'?1.24:.95);this.releases.push(batchStatic(root));this.root.add(root);this.vessels.push({root,radius:r,zScale,angle:phase,speed,direction});
    }
    this.update(0,false,10);
  }
  private addFlyby(kind:BirdKind,count:number,points:number[][],delay:number){
    const root=new T.Group();root.name=`${kind}-flyby`;root.visible=false;root.userData.dynamic=true;this.root.add(root);
    const birds:WingedBird[]=[];
    for(let i=0;i<count;i++){const entry=bird(kind);this.releases.push(batchStatic(entry));entry.position.set((i%2?1:-1)*Math.ceil(i/2)*.7,(i%3)*.1,-Math.ceil(i/2)*.7);entry.scale.multiplyScalar(.85+(i%3)*.08);root.add(entry);birds.push(entry);}
    const materials=new Set<T.Material>();
    root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=true;m.depthWrite=false;m.opacity=0;m.forceSinglePass=true;materials.add(m);}});
    this.flybys.push({root,birds,materials:[...materials],alpha:1,path:new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2]))),cooldown:delay,progress:0,duration:18+this.random()*8,reverse:false});
  }
  private addPerched(kind:BirdKind,x:number,y:number,z:number,rotation:number,scale:number){
    const entry=bird(kind,true);this.releases.push(batchStatic(entry));entry.position.set(x,y,z);entry.rotation.y=rotation;entry.scale.multiplyScalar(scale);this.root.add(entry);this.perched.push(entry);
  }
  private addFish(color:string,delay:number){
    const root=fish(color);this.releases.push(batchStatic(root));root.visible=false;this.root.add(root);
    const splashes=[0,1].map(()=>{const ring=place(this.root,new T.TorusGeometry(.22,.014,4,28),new T.MeshBasicMaterial({color:'#eefbf6',transparent:true,opacity:0,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.visible=false;return ring;});
    this.fish.push({root,splashes,splashAge:[Infinity,Infinity],spot:new T.Vector2(),cooldown:delay,progress:0,duration:1.6,height:1,travel:1.1,angle:0});
  }
  update(dt:number,reduced:boolean,hour:number){
    if(reduced){for(const f of this.flybys)f.root.visible=false;for(const f of this.fish){f.root.visible=false;f.splashes.forEach(s=>s.visible=false);}return;}
    this.elapsed+=dt;const day=birdDaylight(hour);
    for(const flyby of this.flybys){
      if(!flyby.root.visible){
        if(day>.05&&(flyby.cooldown-=dt)<=0){flyby.root.visible=true;flyby.progress=0;flyby.alpha=day;flyby.duration=18+this.random()*9;flyby.reverse=this.random()>.5;}
        else continue;
      }
      flyby.progress+=dt/flyby.duration;
      flyby.alpha+=(day-flyby.alpha)*(1-Math.exp(-dt*1.8));
      const alpha=flightOpacity(flyby.progress)*flyby.alpha;flyby.materials.forEach(m=>m.opacity=alpha);
      if(flyby.progress>=1||flyby.alpha<.001){flyby.root.visible=false;flyby.cooldown=18+this.random()*34;continue;}
      const t=flyby.reverse?1-flyby.progress:flyby.progress,p=flyby.path.getPointAt(t),tangent=flyby.path.getTangentAt(t).multiplyScalar(flyby.reverse?-1:1);
      flyby.root.position.copy(p);flyby.root.rotation.y=Math.atan2(tangent.x,tangent.z);flyby.root.rotation.z=-tangent.y*.18;
      flyby.birds.forEach((entry,i)=>flap(entry,this.elapsed*(kindSpeed(entry.name))+i*.8));
    }
    for(const entry of this.perched)flap(entry,this.elapsed*.8,.045);
    for(const entry of this.fish)this.updateFish(entry,dt);
    for(const entry of this.vessels){
      entry.angle=(entry.angle+dt*entry.speed*entry.direction+Math.PI*2)%(Math.PI*2);
      const {radius:r,zScale,angle:a}=entry,x=Math.cos(a)*r,z=Math.sin(a)*r*zScale;
      entry.root.position.set(x,SEA_Y+.12+Math.sin(this.elapsed*.72+a)*.045,z);
      entry.root.rotation.y=Math.atan2(-Math.sin(a)*r*entry.direction,Math.cos(a)*r*zScale*entry.direction);
      entry.root.rotation.z=Math.sin(this.elapsed*.55+a)*.012;
    }
  }
  private updateFish(entry:LeapingFish,dt:number){
    entry.splashes.forEach((s,i)=>{entry.splashAge[i]+=dt;const t=entry.splashAge[i]/1.2;s.visible=t<1;(s.material as T.MeshBasicMaterial).opacity=Math.max(0,1-t)*.6;s.scale.setScalar(1+Math.min(1,t)*4.5);});
    if(!entry.root.visible){
      if((entry.cooldown-=dt)>0)return;
      const route=chooseFishRoute(this.random,this.regions);if(!route){entry.cooldown=2;return;}
      entry.spot.set(route.x,route.z);entry.travel=route.travel;entry.angle=route.angle;
      entry.root.visible=true;entry.progress=0;entry.duration=1.7+this.random()*.65;entry.height=1+this.random()*1.05;
    }
    const previous=entry.progress;
    entry.progress+=dt/entry.duration;
    const t=Math.min(1,entry.progress),offset=(t*2-1)*entry.travel,dx=Math.cos(entry.angle),dz=Math.sin(entry.angle),arc=entry.height+.95;
    entry.root.position.set(entry.spot.x+dx*offset,SEA_Y-.95+4*arc*t*(1-t),entry.spot.y+dz*offset);
    // YXZ applies pitch in the fish's forward plane at every heading.
    entry.root.rotation.set(-Math.atan2(4*arc*(1-2*t),entry.travel*2),Math.atan2(dx,dz),Math.sin(t*Math.PI*2)*.1,'YXZ');
    (entry.root.userData.tail as T.Group).rotation.y=Math.sin(this.elapsed*18)*.38;
    const crossing=(1-Math.sqrt(1-.95/arc))/2;
    [crossing,1-crossing].forEach((p,i)=>{if(previous<=p&&t>p){entry.splashAge[i]=0;entry.splashes[i].position.set(entry.spot.x+dx*(2*p-1)*entry.travel,SEA_Y+.024,entry.spot.y+dz*(2*p-1)*entry.travel);}});
    if(entry.progress>=1){entry.root.visible=false;entry.cooldown=4+this.random()*12;}
  }
  get snapshot(){
    let separation=Infinity;
    for(let i=0;i<this.vessels.length;i++)for(let j=i+1;j<this.vessels.length;j++)separation=Math.min(separation,this.vessels[i].root.position.distanceTo(this.vessels[j].root.position));
    const fishRadius=Math.max(...this.fish.map(f=>f.spot.length()+f.travel+1));
    return {flyingBirds:this.flybys.reduce((sum,f)=>sum+f.birds.length,0),activeFlybys:this.flybys.filter(f=>f.root.visible).length,birdPositions:this.flybys.filter(f=>f.root.visible).map(f=>f.root.position.toArray()),birdOpacities:this.flybys.map(f=>f.root.visible?f.materials[0].opacity:0),perchedBirds:this.perched.length,fish:this.fish.length,activeFish:this.fish.filter(f=>f.root.visible).length,fishPositions:this.fish.filter(f=>f.root.visible).map(f=>f.root.position.toArray()),fishRoutes:this.fish.map(f=>({x:f.spot.x,z:f.spot.y,angle:f.angle,travel:f.travel})),boats:this.vessels.length,boatPositions:this.vessels.map(v=>v.root.position.toArray()),boatScales:this.vessels.map(v=>v.root.scale.x),routeGap:7,minBoatSeparation:+separation.toFixed(1),fishBoatBuffer:+(88-fishRadius-2.6).toFixed(1)};
  }
  dispose(){
    this.root.removeFromParent();this.releases.forEach(release=>release());const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
    this.root.traverse(object=>{if(object instanceof T.Mesh){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
}

const kindSpeed=(name:string)=>name.includes('crane')?4.5:name.includes('gull')?6:8;
