import * as T from 'three';
import {animalSpecies,seasonalObjects,seededRandom,turnToward} from '../../shared/living-catalog.mjs';
import {LivingNavigation} from '../../shared/living-navigation.mjs';
import {createAnimalState,updateAnimal,petAnimal,animalCollider} from '../../shared/animal-behavior.mjs';
import {groundHeight} from '../../shared/terrain-height.mjs';
import {overlaps,supportedFootprint,bodyFootprint} from '../../shared/navigation.mjs';
import {seasonalModel} from './living-models';
import {animalModel} from './animal-models';
import {batchStatic} from './optimizer';
import type {Catalog} from '../core/types';
import type {Obstacle} from './scenery';
import type {EventBus,LivingPrompt} from '../core/events';

type Point={x:number;y:number;z:number};
type Player=Point&{grounded:boolean;vy:number;stepOffset?:number};
type Animal={state:ReturnType<typeof createAnimalState>;rig:ReturnType<typeof animalModel>;hearts:T.Sprite[]};
type Item=Point&{id:string;kind:string;name:string;radius:number;height:number;root:T.Group;home:Point};

/** Additive inhabitants: the original terrain, architecture and collider list stay authoritative. */
export class LivingWorld{
  readonly nav:LivingNavigation;
  private root=new T.Group();private animals:Animal[]=[];private items:Item[]=[];
  private random=seededRandom(0x861abc);private releases:(()=>void)[]=[];private time=0;
  private carried:Item|null=null;private mounted:Animal|null=null;
  private candidate:Item|Animal|null=null;private promptKey='';private available=false;
  private touch=window.matchMedia('(pointer:coarse)').matches;
  private drop:Point|null=null;private ghost:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>;
  constructor(scene:T.Scene,data:Catalog,obstacles:Obstacle[],reserved:{x:number;z:number;radius:number}[],private bus:EventBus){
    this.root.name='seasonal-living-world';scene.add(this.root);this.nav=new LivingNavigation(data.regions,obstacles,reserved);
    const occupied:{x:number;z:number;radius:number}[]=[];
    const heartCanvas=document.createElement('canvas');heartCanvas.width=heartCanvas.height=64;
    const c=heartCanvas.getContext('2d')!;c.fillStyle='#e39793';c.beginPath();c.moveTo(32,54);c.bezierCurveTo(-5,31,6,1,26,14);c.lineTo(32,20);c.lineTo(38,14);c.bezierCurveTo(58,1,69,31,32,54);c.fill();
    const heartMap=new T.CanvasTexture(heartCanvas);heartMap.colorSpace=T.SRGBColorSpace;this.releases.push(()=>heartMap.dispose());
    for(const spec of animalSpecies){
      const region=data.regions.find(r=>r.season===spec.season);if(!region)continue;
      const p=this.nav.place(region,spec.radius,this.random,occupied,true);if(!p)throw new Error(`No safe clearing for ${spec.kind}`);
      const state=createAnimalState({...spec,regionId:region.id},p,this.random),rig=animalModel(spec.kind);
      for(const part of [...rig.parts].reverse())this.releases.push(batchStatic(part));
      this.releases.push(batchStatic(rig.root));rig.root.position.set(p.x,p.y,p.z);this.root.add(rig.root);
      const hearts=Array.from({length:3},()=>{const s=new T.Sprite(new T.SpriteMaterial({map:heartMap,transparent:true,depthWrite:false,opacity:0}));s.scale.setScalar(.18);s.visible=false;this.root.add(s);return s;});
      this.animals.push({state,rig,hearts});occupied.push({...p,radius:spec.radius+.6});
    }
    for(const region of data.regions)for(const spec of seasonalObjects[region.season as keyof typeof seasonalObjects]??[]){
      const p=this.nav.place(region,spec.radius,this.random,occupied);if(!p)throw new Error(`No safe placement for ${spec.kind}`);
      const root=seasonalModel(spec.kind);
      // Fit the complete sculpt, including handles and stems, inside its placement footprint.
      const box=new T.Box3().setFromObject(root),rad=Math.hypot(Math.max(Math.abs(box.min.x),Math.abs(box.max.x)),Math.max(Math.abs(box.min.z),Math.abs(box.max.z)));
      root.scale.setScalar(Math.min(1,spec.radius/Math.max(rad,.01)));root.position.set(p.x,p.y,p.z);root.rotation.y=this.random()*Math.PI*2;
      const rotor=root.getObjectByName('pinwheel-rotor');if(rotor)rotor.userData.dynamic=true;
      this.releases.push(batchStatic(root));this.root.add(root);
      this.items.push({...spec,...p,id:`${region.id}-${spec.kind}`,root,home:{...p}});occupied.push({...p,radius:spec.radius+.45});
    }
    this.ghost=new T.Mesh(new T.RingGeometry(.28,.31,40),new T.MeshBasicMaterial({color:'#659e87',side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));
    this.ghost.rotation.x=-Math.PI/2;this.ghost.visible=false;this.root.add(this.ghost);
  }
  get ride(){return this.mounted?.state??null;}
  get rideRadius(){return (this.mounted?.state.bodyRadius??.35)+.09;}
  get rideFootprint(){const a=this.mounted?.state;return a?bodyFootprint(a.yaw,a.bodyLength+.1):[{x:0,z:0}];}
  get carrying(){return !!this.carried;}
  get focused(){return this.available&&!!(this.candidate||this.carried||this.mounted);}
  private occupied(except?:Item|Animal){
    return [...this.items.filter(i=>i!==this.carried&&i!==except).map(i=>({x:i.x,z:i.z,radius:i.radius})),
      ...this.animals.filter(a=>a!==except&&a!==this.mounted).map(a=>({x:a.state.x,z:a.state.z,radius:a.state.radius}))];
  }
  get colliders():Obstacle[]{
    return [...this.items.filter(i=>i!==this.carried).map(i=>({x:i.x,z:i.z,radius:i.radius,height:i.y+i.height})),
      ...this.animals.filter(a=>a!==this.mounted).map(a=>animalCollider(a.state))];
  }
  canRide(x:number,z:number){
    return !this.mounted||supportedFootprint(x,z,this.nav.regions,this.rideRadius,this.rideFootprint);
  }
  steerRide(velocity:T.Vector3,dt:number){
    const a=this.mounted?.state,speed=velocity.length();if(!a||speed<.001)return;
    const desired=Math.atan2(velocity.x,velocity.z);
    const yaw=turnToward(a.yaw,desired,dt*5.8),footprint=bodyFootprint(yaw,a.bodyLength+.1);
    if(supportedFootprint(a.x,a.z,this.nav.regions,this.rideRadius,footprint)&&
      ![...this.nav.nearby(a.x,a.z,a.radius)].some(o=>(o.height??Infinity)>a.y+.55&&footprint.some(p=>overlaps(a.x+p.x,a.z+p.z,o,this.rideRadius))))a.yaw=yaw;
  }
  private message(text:string){this.bus.emit('livingMessage',text);}
  interact(key:'Q'|'T',player:Player,yaw:number){
    if(!this.available)return;
    if(this.mounted){if(key==='T')this.dismount(player);return;}
    if(this.carried){
      if(key==='Q'&&this.drop&&player.grounded){
        Object.assign(this.carried,this.drop);this.carried.root.position.set(this.drop.x,this.drop.y,this.drop.z);this.carried.root.rotation.set(0,yaw,0);
        this.message(`放下了${this.carried.name}`);this.carried=null;this.ghost.visible=false;
      }else if(key==='Q')this.message('再挪一步，找一块平坦、空旷的地面');
      return;
    }
    const target=this.candidate;if(!target||!player.grounded)return;
    if('rig' in target){
      const a=target.state;
      if(key==='Q'&&petAnimal(a)){this.message(a.kind==='heron'||a.kind==='penguin'?`${a.name}轻轻抖了抖羽毛`:`${a.name}开心地回应了你`);this.bus.emit('sound','interaction');}
      else if(key==='T'&&a.ride&&supportedFootprint(a.x,a.z,this.nav.regions,a.bodyRadius+.09,bodyFootprint(a.yaw,a.bodyLength+.1))){
        a.mode='ridden';a.target=null;this.mounted=target;player.x=a.x;player.y=a.y;player.z=a.z;player.vy=0;
        this.message(`骑上${a.name} · 沿桥梁自由探索群岛 · T 下来`);
      }
    }else if(key==='Q'){this.carried=target;this.message(`拿起了${target.name} · Q 放在绿圈处`);}
    this.candidate=null;
  }
  private dismount(player:Player){
    const animal=this.mounted;if(!animal||!player.grounded){this.message('落地后再下来');return;}
    const a=animal.state,dynamic=[...this.occupied(),{x:a.x,z:a.z,radius:a.radius}];
    for(let ring=0;ring<6;ring++)for(let i=0;i<24;i++){
      const angle=a.yaw+Math.PI/2+i*Math.PI/12,r=a.radius+.52+ring*.25,x=a.x+Math.sin(angle)*r,z=a.z+Math.cos(angle)*r;
      const y=this.nav.travel(x,z,.36,null,dynamic);
      if(y===null||!this.nav.sight({x:a.x,y:a.y+.6,z:a.z},{x,y:y+.6,z}))continue;
      player.x=x;player.y=y;player.z=z;player.vy=0;player.grounded=true;a.mode='watch';a.timer=2;a.home={x:a.x,y:a.y,z:a.z};a.regionId=this.nav.regionAt(a.x,a.z,a.radius)?.id??null;this.mounted=null;this.message('轻轻落地');return;
    }
    this.message('身边有障碍，骑到开阔处再下来');
  }
  /** Keep objects in hand during fast travel; settle a mount on its current support. */
  beforeTeleport(){
    if(this.mounted){
      const a=this.mounted.state,footprint=this.rideFootprint;a.y=groundHeight(a.x,a.z,this.nav.regions);
      for(const o of this.nav.nearby(a.x,a.z,a.radius))if((o.height??Infinity)<=a.y+.55&&footprint.some(p=>overlaps(a.x+p.x,a.z+p.z,o,this.rideRadius)))a.y=Math.max(a.y,o.height??a.y);
      a.mode='rest';a.timer=3;a.home={x:a.x,y:a.y,z:a.z};a.regionId=this.nav.regionAt(a.x,a.z,a.radius)?.id??null;this.mounted=null;
    }
    this.candidate=null;this.drop=null;this.ghost.visible=false;
  }
  update(dt:number,player:Player,camera:T.PerspectiveCamera,yaw:number,available:boolean,reduced:boolean){
    this.available=available;this.time+=dt;const speed=dt>0&&this.mounted?Math.hypot(player.x-this.mounted.state.x,player.z-this.mounted.state.z)/dt:0;
    for(const a of this.animals){
      if(a===this.mounted){
        a.state.x=player.x;a.state.y=player.y;a.state.z=player.z;
        a.state.regionId=this.nav.regionAt(player.x,player.z)?.id??null;
        a.state.walkPhase+=Math.min(2.8,speed/(a.state.stride??1))*dt*Math.PI*2;a.state.velocity=speed;
        a.state.expression+=dt;
        a.state.headYaw=turnToward(a.state.headYaw,0,dt);
        a.state.petCooldown=Math.max(0,a.state.petCooldown-dt);a.state.affection=Math.max(0,a.state.affection-dt);
      }else if(dt>0)updateAnimal(a.state,dt,player,this.nav,[...this.occupied(a),...(this.mounted?[{x:player.x,z:player.z,radius:this.mounted.state.radius}]:[])],this.random);
      const s=a.state;a.rig.root.position.set(s.x,s.y+(a===this.mounted?(player.stepOffset??0):0),s.z);a.rig.root.rotation.y=s.yaw;
      const cos=Math.cos(s.yaw),sin=Math.sin(s.yaw);
      a.rig.animate(s.walkPhase,reduced?0:Math.min(1,s.velocity*2),s.headYaw,s.mode,s.expression,
        (x,z)=>a===this.mounted&&!player.grounded?0:Math.max(-.18,Math.min(.18,groundHeight(s.x+x*cos+z*sin,s.z-x*sin+z*cos,this.nav.regions)-s.y)),
        {run:a===this.mounted?Math.min(1,speed/7):0,air:a===this.mounted&&!player.grounded});
      a.hearts.forEach((h,i)=>{
        const age=3.2-s.affection-i*.3;h.visible=s.affection>0&&age>0&&age<2;
        if(h.visible){h.position.set(s.x+Math.sin(i*2.4)*.2,s.y+s.height+.12+age*.3,s.z+Math.cos(i*2.4)*.16);(h.material as T.SpriteMaterial).opacity=Math.sin(age/2*Math.PI)*.9;}
      });
    }
    for(const i of this.items){const rotor=i.root.getObjectByName('pinwheel-rotor');if(rotor&&!reduced)rotor.rotation.z+=dt*.7;}
    if(this.carried)this.carried.root.visible=available;
    this.candidate=null;this.drop=null;this.ghost.visible=false;
    let prompt:LivingPrompt|null=null;
    if(available&&this.carried){
      const item=this.carried;camera.updateMatrixWorld();
      const hand=camera.localToWorld(new T.Vector3(.37,-.55,-.85));
      // Retract the hand against walls; the sculpture never protrudes through them.
      for(let t=1;t>=0;t-=.2){
        const x=T.MathUtils.lerp(player.x,hand.x,t),z=T.MathUtils.lerp(player.z,hand.z,t);
        if([...this.nav.nearby(x,z,item.radius)].some(o=>(o.height??Infinity)>hand.y&&overlaps(x,z,o,item.radius)))continue;
        item.root.position.set(x,hand.y,z);break;
      }
      item.root.rotation.set(0,yaw+.3,0);
      const x=player.x-Math.sin(yaw)*1.15,z=player.z-Math.cos(yaw)*1.15;
      const y=this.nav.ground(x,z,item.radius,null,this.occupied(),true,.035);
      if(y!==null&&player.grounded&&Math.abs(y-player.y)<.25&&this.nav.sight({...player,y:player.y+.3},{x,y:y+.3,z}))this.drop={x,y,z};
      this.ghost.visible=true;this.ghost.position.set(x,(y??groundHeight(x,z,this.nav.regions))+.025,z);this.ghost.material.color.set(this.drop?'#659e87':'#ca8d7a');
      this.ghost.scale.setScalar(item.radius/.28);
      prompt={title:item.name,detail:this.drop?'抱在手中 · 可以放在绿圈处':'抱在手中 · 移到平坦空地再放下',q:'放下',t:null,disabled:!this.drop};
    }else if(available&&this.mounted){
      prompt={title:`与${this.mounted.state.name}同行`,detail:this.touch?'拖动摇杆移动 · 点右下角跳跃':'WASD 移动 · Shift 快跑 · 空格跳跃',q:null,t:'下来',disabled:!player.grounded};
    }else if(available){
      let score=Infinity;
      for(const target of [...this.items,...this.animals]){
        const p='rig' in target?target.state:target,dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);
        const alignment=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/Math.max(.01,d);
        if(d>p.radius+1.4||Math.abs(p.y-player.y)>.45||alignment<.35)continue;
        const rank=d-p.radius+(1-alignment)*2.5;
        if(rank<score&&this.nav.sight({...player,y:player.y+.5},{...p,y:p.y+.5})){this.candidate=target;score=rank;}
      }
      if(this.candidate){
        const a='rig' in this.candidate?this.candidate.state:null;
        const descriptions:Record<string,string>={watch:'它正好奇地打量着你',yield:'它轻轻让开，给你留出路',follow:'它想和你再待一会儿',sniff:'它正在嗅闻周围的新气息',graze:'它低头寻找嫩叶',groom:'它正认真梳理毛发',preen:'它正在整理羽毛',stretch:'它舒展身体，伸了个懒腰',play:'它正跃跃欲试',forage:'它正在寻找小小的美味'};
        prompt=a?{title:a.name,detail:a.petCooldown>0?'它还在回味你的抚摸':descriptions[a.mode]??'放轻脚步，打个招呼',q:a.petCooldown>0?null:'抚摸',t:a.ride?'骑乘':null,disabled:!player.grounded}:
          {title:(this.candidate as Item).name,detail:'四季拾物 · 可以抱起、搬运与摆放',q:'拿起',t:null,disabled:!player.grounded};
      }
    }
    const key=JSON.stringify(prompt);if(key!==this.promptKey){this.promptKey=key;this.bus.emit('livingNearby',prompt);}
  }
  get snapshot(){return {
    items:this.items.map(({root,home,...i})=>({...i,held:i.id===this.carried?.id,home})),
    animals:this.animals.map(({state:s})=>({...s,home:{...s.home}})),
    carried:this.carried?.id??null,mounted:this.mounted?.state.kind??null,drop:this.drop,
    hearts:this.animals.reduce((n,a)=>n+a.hearts.filter(h=>h.visible).length,0),
  };}
  dispose(){this.releases.forEach(release=>release());}
}
