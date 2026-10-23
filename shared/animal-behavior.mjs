import {turnToward,angleDelta} from './living-catalog.mjs';

export const createAnimalState=(spec,home,random)=>({
  ...spec,...home,home:{...home},yaw:random()*Math.PI*2,headYaw:0,mode:'sniff',timer:.5+random()*1.5,
  target:null,walkPhase:random()*6.28,petCooldown:0,affection:0,velocity:0,blocked:0,
  attention:random()*2,trust:0,expression:random()*30,
});

const habits={
  cat:['groom','stretch','sniff','rest'],deer:['graze','sniff','watch'],
  rabbit:['sniff','groom','watch'],crab:['forage','watch'],heron:['preen','watch','forage'],
  tortoise:['graze','sniff','rest'],fox:['sniff','stretch','watch'],shiba:['sniff','play','watch'],
  'polar-bear':['sniff','stretch','rest'],penguin:['preen','play','watch'],
};
/** @returns {{x:number,z:number,radius:number,segment:[number,number,number,number],height:number,base:number,dynamic:boolean}} */
export function animalCollider(a){
  const half=a.bodyLength??a.radius*.4,r=a.bodyRadius??a.radius*.45;
  return {x:a.x,z:a.z,radius:r,segment:[a.x-Math.sin(a.yaw)*half,a.z-Math.cos(a.yaw)*half,
    a.x+Math.sin(a.yaw)*half,a.z+Math.cos(a.yaw)*half],height:a.y+a.height,base:a.y,dynamic:true};
}
function destination(a,nav,dynamic,player,random,away=false){
  for(let i=0;i<20;i++){
    const angle=away?Math.atan2(a.x-player.x,a.z-player.z)+(random()-.5)*2.4:random()*Math.PI*2;
    const r=away?.7+random():.8+random()*2.3,p={x:a.x+Math.sin(angle)*r,z:a.z+Math.cos(angle)*r};
    if(Math.hypot(p.x-a.home.x,p.z-a.home.z)>4.5||Math.hypot(p.x-player.x,p.z-player.z)<a.radius+.5)continue;
    if(nav.route(a,p,a.radius,a.regionId,dynamic))return p;
  }
  return null;
}
/** Species habits, interruptible attention, voluntary yielding and path recovery. */
export function updateAnimal(a,dt,player,nav,dynamic,random){
  dt=Math.max(0,Math.min(.1,dt));if(!dt)return;
  a.petCooldown=Math.max(0,a.petCooldown-dt);a.affection=Math.max(0,a.affection-dt);a.expression+=dt;
  if(a.mode==='ridden')return;
  const distance=Math.hypot(player.x-a.x,player.z-a.z),sees=distance<5&&Math.abs(player.y-a.y)<2&&nav.sight({...a,y:a.y+.5},{...player,y:player.y+.7});
  a.timer-=dt;a.attention-=dt;a.velocity=0;
  // Attention checks have a cooldown. Walk-bys sometimes get a glance and sometimes are ignored.
  if(a.attention<=0){
    a.attention=1.2+random()*2.8;
    if(sees&&distance>a.radius+.7&&random()<.48&&a.mode!=='pet'){
      a.mode='watch';a.timer=.8+random()*1.6;a.target=null;
    }
  }
  if(sees&&distance<a.radius+.52&&a.mode!=='pet'&&a.mode!=='yield'){
    a.target=destination(a,nav,dynamic,player,random,true);
    if(a.target){a.mode='yield';a.timer=2.5;}
  }
  if(a.mode==='pet'){
    a.headYaw=turnToward(a.headYaw,Math.max(-.65,Math.min(.65,angleDelta(a.yaw,Math.atan2(player.x-a.x,player.z-a.z)))),dt*2);
    if(a.timer<=0){a.mode='watch';a.timer=.8+random();}
    return;
  }
  if(a.timer<=0){
    const roll=random();a.target=null;
    if(sees&&distance>2&&a.trust>0&&roll<.23){
      const d=Math.max(0,distance-a.radius-1.2),p={x:a.x+(player.x-a.x)*d/distance,z:a.z+(player.z-a.z)*d/distance};
      if(Math.hypot(p.x-a.home.x,p.z-a.home.z)<4.5&&nav.route(a,p,a.radius,a.regionId,dynamic))a.target=p;
      a.mode=a.target?'follow':'watch';a.timer=3;
    }else if(roll<.53){
      a.target=destination(a,nav,dynamic,player,random);a.mode=a.target?'wander':'sniff';a.timer=a.target?7:1;
    }else{
      const list=habits[a.kind]??['rest'];a.mode=list[Math.floor(random()*list.length)];a.timer=1.3+random()*2.4;
    }
  }
  const desired=sees&&['watch','follow'].includes(a.mode)?Math.atan2(player.x-a.x,player.z-a.z):a.yaw+Math.sin(a.expression*.8)*.2;
  a.headYaw=turnToward(a.headYaw,Math.max(-.8,Math.min(.8,angleDelta(a.yaw,desired))),dt*1.8);
  if(['wander','follow','yield'].includes(a.mode)&&a.target){
    const dx=a.target.x-a.x,dz=a.target.z-a.z,d=Math.hypot(dx,dz),heading=Math.atan2(dx,dz);
    a.yaw=turnToward(a.yaw,heading+(a.kind==='crab'?Math.PI/2:0),dt*(a.ride?2:3.6));
    if(d<.12){a.mode='sniff';a.timer=.6+random();a.target=null;return;}
    const alignment=a.kind==='crab'?1:Math.max(.2,Math.cos(angleDelta(a.yaw,heading)));
    const step=Math.min(d,a.speed*dt*alignment),next={x:a.x+dx/d*step,z:a.z+dz/d*step};
    const nextDistance=Math.hypot(next.x-player.x,next.z-player.z);
    // An already overlapping player must never prevent the animal from moving away.
    const playerClear=nextDistance>a.bodyRadius+.45||nextDistance>distance;
    if(playerClear&&nav.route(a,next,a.radius,a.regionId,dynamic)){
      a.x=next.x;a.z=next.z;a.y=nav.travel(a.x,a.z,a.radius,a.regionId)??a.y;
      a.velocity=step/dt;a.walkPhase+=step/(a.stride??.45)*Math.PI*2;a.blocked=0;
    }else{
      a.blocked+=dt;
      if(a.blocked>.25){a.target=destination(a,nav,dynamic,player,random);a.timer=a.target?4:.4;a.mode=a.target?'wander':'sniff';a.blocked=0;}
    }
  }
}

export function petAnimal(animal){
  if(animal.petCooldown>0||animal.mode==='ridden')return false;
  animal.mode='pet';animal.target=null;animal.timer=1.8;animal.petCooldown=3.5;animal.affection=3.2;animal.velocity=0;animal.trust=Math.min(3,animal.trust+1);return true;
}
