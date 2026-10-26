import {advanceWalker,createWalker} from './locomotion.mjs';
import {supportedFootprint} from './navigation.mjs';
import {landPath,seaPath,skyPath,waterClear,waterContact,moveBoat} from './game-routes.mjs';
import {bikeBody,bikeFootprint,bikeObstruction,bikeMotion} from './bike-contact.mjs';
import {moveGlider} from './flight-contact.mjs';

export const gameCatalog=[
  {id:'spring',name:'四季环岛骑行',vehicle:'山地摩托',tag:'春 · 陆地',color:'#ba685e',description:'沿山路与桥梁，环游四岛。',controls:'W / S 油门、倒车 · A / D 转向 · Shift 漂移 · 空格刹车 · E 加速'},
  {id:'summer',name:'群岛穿桥航线',vehicle:'海滩快艇',tag:'夏 · 海上',color:'#497f7e',description:'绕岛航行，穿过石桥。',controls:'W / S 油门、倒车 · A / D 转向 · 空格刹车 · Shift 加速'},
  {id:'autumn',name:'山海长空巡游',vehicle:'滑翔伞',tag:'秋 · 空中',color:'#aa7b39',description:'在群岛上空升降、转弯。',controls:'W 俯冲 · S 抬升 · A / D 转向 · 空格减速'},
  {id:'winter',name:'雪夜游艺室',vehicle:'益智小游戏',tag:'冬 · 游艺室',color:'#687f9f',description:'选个小游戏，玩一会儿。',controls:'方向键操作 · P 暂停'},
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const formatTime=t=>{
  if(!Number.isFinite(t))return '—';
  const ticks=Math.round(Math.max(0,t)*100);
  return `${Math.floor(ticks/6000).toString().padStart(2,'0')}:${(ticks%6000/100).toFixed(2).padStart(5,'0')}`;
};
export const thermals=[{x:-45,z:28,radius:10},{x:-6,z:36,radius:10},{x:14,z:-12,radius:9},{x:-13,z:-58,radius:10},{x:-33,z:-22,radius:9}];
export const seaHeight=(x,z,t)=>-5.65+Math.sin(x*.17+t*1.8)*.13+Math.sin(z*.22-t*1.3)*.09;

/** Authored routes reuse existing terrain; the game adds no new walkable topology. */
export function makeCourse(id,regions,obstacles=[]){
  /** @type {{x:number;y:number;z:number}[]} */
  const path=id==='spring'?landPath(regions,obstacles):id==='summer'?seaPath():skyPath();
  // Arc-length sampling gives each checkpoint enough separation to avoid accidental multi-hits.
  /** @type {{x:number;y:number;z:number;nx:number;nz:number;radius:number}[]} */
  const gates=[{...path[0],nx:0,nz:1,radius:1}],indices=[0];let distance=0,length=0;
  for(let i=1;i<path.length;i++){
    const d=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z,path[i].y-path[i-1].y);distance+=d;length+=d;
    if(distance>=(id==='spring'?7:20)&&i<path.length-3&&(id!=='spring'||supportedFootprint(path[i].x,path[i].z,regions,1.85))){gates.push({...path[i],nx:0,nz:1,radius:1});indices.push(i);distance=0;}
  }
  if(Math.hypot(gates.at(-1).x-gates[0].x,gates.at(-1).z-gates[0].z)<(id==='spring'?5:15))gates.pop();
  const radius=id==='spring'?1.65:id==='summer'?5.2:6;
  gates.forEach((g,i)=>{const at=indices[i],a=path[(at-3+path.length-1)%(path.length-1)],b=path[(at+3)%(path.length-1)],d=Math.hypot(b.x-a.x,b.z-a.z)||1;Object.assign(g,{nx:(b.x-a.x)/d,nz:(b.z-a.z)/d,radius});});
  const reference=length*2/(id==='spring'?4.4:id==='summer'?9.5:10.8);
  return {id,version:id==='summer'?2:3,path,gates,gateIndices:indices.slice(0,gates.length),laps:2,length,medals:[reference,reference*1.35],spawn:{...gates[0],yaw:Math.atan2(gates[0].nx,gates[0].nz)}};
}
/** @param {ReturnType<typeof makeCourse>} course */
export function createRace(course,leisure=false){return {course,leisure,next:1,lap:1,elapsed:0,penalty:0,countdown:3,finished:false,passed:0};}
export function advanceRace(race,previous,current,dt){
  if(race.finished)return false;
  if(race.countdown>0){race.countdown=Math.max(0,race.countdown-dt);return false;}
  race.elapsed+=dt;if(race.leisure)return false;
  const g=race.course.gates[race.next],a=(previous.x-g.x)*g.nx+(previous.z-g.z)*g.nz,b=(current.x-g.x)*g.nx+(current.z-g.z)*g.nz;
  if(a>0||b<=0)return false;
  const t=-a/(b-a),x=previous.x+(current.x-previous.x)*t,z=previous.z+(current.z-previous.z)*t,y=previous.y+(current.y-previous.y)*t;
  const horizontal=Math.hypot(x-g.x,z-g.z);
  if(race.course.id==='autumn'?Math.hypot(horizontal,y-g.y)>g.radius+1.25:horizontal>g.radius||Math.abs(y-g.y)>2.8)return false;
  race.passed++;
  if(race.next===0){if(race.lap===race.course.laps)race.finished=true;else race.lap++;}
  race.next=(race.next+1)%race.course.gates.length;return true;
}
export const raceGrade=(race)=>race.elapsed+race.penalty<=race.course.medals[0]?'gold':race.elapsed+race.penalty<=race.course.medals[1]?'silver':'bronze';
export function resetRaceVehicle(race){
  const g=race.course.gates[(race.next-1+race.course.gates.length)%race.course.gates.length];
  if(!race.leisure&&race.countdown===0)race.penalty+=5;
  race.countdown=3;
  return {...g,yaw:Math.atan2(g.nx,g.nz)};
}
/** Bad JSON, old formats and unavailable storage never prevent play. */
export function readBest(storage,key){
  try{const n=JSON.parse(storage.getItem('xiangmeta.games.v1.'+key));return typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;}catch{return null;}
}
export function saveBest(storage,key,value,lower=false){
  const before=readBest(storage,key),best=before===null?value:lower?Math.min(before,value):Math.max(before,value);
  if(!Number.isFinite(value)||value<0)return {best:before,record:false,saved:false};
  try{storage.setItem('xiangmeta.games.v1.'+key,JSON.stringify(best));return {best,record:before===null||best!==before,saved:true};}
  catch{return {best,record:before===null||best!==before,saved:false};}
}
export function createVehicle(kind,point){return {...createWalker(point.x,point.z),y:point.y,yaw:point.yaw,speed:kind==='autumn'?11:0,vx:0,vz:0,bank:0,pitch:0,boost:1,boostReady:true,drift:0,kind,hit:false};}
export const seaClear=waterClear;
/** Fixed short integration steps preserve grip/collision at both 30 and 120 Hz. */
export function advanceVehicle(s,input,dt,regions,obstacles,time=0){
  if(dt<=0)return s;
  const steps=Math.max(1,Math.ceil(clamp(dt,0,.1)*120)),h=clamp(dt,0,.1)/steps;s.hit=false;
  for(let k=0;k<steps;k++){
    const turn=clamp(input.turn||0,-1,1),throttle=clamp(input.throttle||0,-1,1),brake=!!input.brake;
    if(s.kind==='autumn'){
      s.bank+=(turn*-.68-s.bank)*(1-Math.exp(-h*8));
      s.pitch+=(-throttle*.43-s.pitch)*(1-Math.exp(-h*7));
      s.speed=clamp(s.speed+(throttle*(throttle<0?1.6:3.8)+(11-s.speed)*.75-(brake?4:0))*h,6,19);
      s.yaw+=turn*(.9+s.speed*.04)*(brake?1.6:1)*h;
      const lift=thermals.reduce((v,t)=>Math.max(v,Math.max(0,1-Math.hypot(s.x-t.x,s.z-t.z)/t.radius)*6),0);
      const vertical=-.45-throttle*(s.speed>8?5.3:2.5)+lift-(s.speed<8?(8-s.speed)*.6:0);
      s.vy+=(vertical-s.vy)*(1-Math.exp(-h*8));
      moveGlider(s,Math.sin(s.yaw)*s.speed*h,Math.cos(s.yaw)*s.speed*h,s.vy*h,regions,obstacles);
    }else{
      if(!input.boost&&s.boost>=.25)s.boostReady=true;
      const bike=s.kind==='spring',boost=!!input.boost&&s.boostReady&&s.boost>0&&throttle>0&&!brake;
      s.drift+=((bike&&input.drift&&Math.abs(turn)>.05&&s.speed>1.5?1:0)-s.drift)*(1-Math.exp(-h*12));
      s.boost=clamp(s.boost+h*(boost?-.28:.13),0,1);
      if(s.boost===0)s.boostReady=false;
      const acceleration=bike?8:7,drag=bike?.6:.24,limit=(bike?11.5:18)*(boost?1.4:1);
      if(throttle*s.speed<0)s.speed*=Math.exp(-h*3.5);
      const beforeSpeed=s.speed;
      s.speed+=throttle*acceleration*h*(boost?1.65:1);s.speed*=Math.exp(-(drag+(brake?5:0))*h);
      s.speed=clamp(s.speed,-3.5,Math.max(limit,beforeSpeed-acceleration*h));
      s.speed*=Math.exp(-s.drift*.30*h);
      const steer=(bike?2.05+2.9*s.drift:2.25)/(1+Math.abs(s.speed)/(bike?22:36));
      const yaw=s.yaw+turn*steer*(s.speed<-.1?-1:1)*Math.min(1,Math.abs(s.speed)/(bike?1:3))*h;
      const footprint=bikeFootprint(yaw);
      if(bike?supportedFootprint(s.x,s.z,regions,bikeBody.radius,footprint)&&
        bikeObstruction(s,s.x,s.z,yaw,obstacles).depth===0:
        waterContact(s.x,s.z,regions,yaw).depth<=waterContact(s.x,s.z,regions,s.yaw).depth+.00001)s.yaw=yaw;
      const grip=bike?14-10*s.drift:4.2,blend=1-Math.exp(-grip*h);
      s.vx+=(Math.sin(s.yaw)*s.speed-s.vx)*blend;s.vz+=(Math.cos(s.yaw)*s.speed-s.vz)*blend;
      const x=s.x,z=s.z,oldY=s.y;
      if(bike){
        const support=bikeFootprint(s.yaw),motion=bikeMotion(s,s.vx*h,s.vz*h,regions,obstacles);
        advanceWalker(s,{x:motion.x/h,z:motion.z/h},h,regions,obstacles.filter(o=>(o.height??Infinity)<=s.y+bikeBody.step),{
          radius:bikeBody.radius,footprint:support,stepHeight:bikeBody.step,canEnter:(x,z)=>supportedFootprint(x,z,regions,bikeBody.radius,support),
        });
        if(motion.hit)s.hit=true;
        const slope=(s.y-oldY)/(Math.abs(s.speed)*h+.001);s.pitch+=(clamp(Math.atan(slope),-.4,.4)-s.pitch)*(1-Math.exp(-h*7));
      }else{
        if(moveBoat(s,s.vx*h,s.vz*h,regions))s.hit=true;
        s.y=seaHeight(s.x,s.z,time);s.pitch=Math.sin(time*3+s.x*.1)*.022+Math.min(.075,Math.abs(s.speed)*.0035);
      }
      if(bike&&Math.hypot(s.x-x,s.z-z)<Math.abs(s.speed)*h*.15)s.speed*=Math.exp(-h*5);
      s.bank+=(-turn*Math.abs(s.speed)*(bike?.026+s.drift*.016:.016)-s.bank)*(1-Math.exp(-h*9));
    }
  }
  return s;
}
