import * as T from 'three';
import type {Catalog} from '../core/types';
import type {Obstacle} from './scenery';
import {gameCatalog,makeCourse,createRace,advanceRace,raceGrade,readBest,saveBest,formatTime,createVehicle,advanceVehicle,resetRaceVehicle,thermals,angleDiff} from '../../shared/seasonal-games.mjs';
import {arcadeCatalog,arcadeScoreKey} from '../../shared/arcade.mjs';
import {LivingNavigation} from '../../shared/living-navigation.mjs';
import {seededRandom} from '../../shared/living-catalog.mjs';
import {groundHeight} from '../../shared/terrain-height.mjs';
import {onGround,overlaps} from '../../shared/navigation.mjs';
import {gameStall,gameVehicle,releaseGameObject} from './game-models';
import {batchStatic} from './optimizer';
import {gateVisibility,guidanceWindow} from '../../shared/race-guidance.mjs';
import {RouteGuide} from './route-guide';
import type {ArcadeRoom} from './arcade-room';
import '../games.css';

type Point={x:number;y:number;z:number};
type Stall={id:string;name:string;x:number;y:number;z:number;approach:{x:number;z:number}};
type Hooks={lock:()=>void;arrive:(x:number,z:number,tx:number,tz:number)=>void;dynamic:()=>Obstacle[];sound:()=>void};
const directionCodes=['KeyW','KeyS','KeyA','KeyD','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'];
export class SeasonalGames{
  private stalls:Stall[]=[];private roots:T.Group[]=[];private releases:(()=>void)[]=[];
  private prompt=document.createElement('button');private dialog=document.createElement('dialog');private hud=document.createElement('div');
  private events=new AbortController();private keys=new Set<string>();private touch=new Map<number,string>();private arc?:ArcadeRoom;
  private race:ReturnType<typeof createRace>|null=null;private vehicle:ReturnType<typeof createVehicle>|null=null;private rig:ReturnType<typeof gameVehicle>|null=null;
  private routeRoot=new T.Group();private gateMeshes:T.Mesh[]=[];
  private routeGuide=new RouteGuide();
  private effects?:T.Points;private particles:number[]=[];private effectTime=0;private effectKind='bronze';
  private trail?:T.InstancedMesh;private trailSamples:{x:number;y:number;z:number;age:number;side:number}[]=[];private trailCursor=0;private trailClock=0;private transform=new T.Object3D();
  private paused=false;private near:Stall|null=null;private time=0;private uiTime=0;private cameraReady=false;private loading=0;
  private lastFrame=performance.now();
  private navigation:LivingNavigation;
  private courses=new Map<string,ReturnType<typeof makeCourse>>();
  private storage:Storage;private returnFocus:HTMLElement|null=null;private blocked=false;
  private touchExperience=document.documentElement.classList.contains('touch-experience');
  constructor(private scene:T.Scene,private host:HTMLElement,private data:Catalog,obstacles:Obstacle[],reserved:{x:number;z:number;radius:number}[],private hooks:Hooks){
    try{this.storage=localStorage;}catch{this.storage={getItem:()=>null,setItem:()=>{throw Error('storage unavailable');}} as unknown as Storage;}
    const random=seededRandom(768);
    for(const spec of gameCatalog){
      const region=data.regions.find(r=>r.season===spec.id);if(!region)continue;
      const nav=new LivingNavigation(data.regions,obstacles,reserved);
      let p=nav.place(region,1.70,random);
      if(!p){
        for(let x=-region.radius+3;x<region.radius-3&&!p;x+=.8)for(let z=-region.radius+3;z<region.radius-3&&!p;z+=.8){
          const wx=x+region.position[0],wz=z+region.position[1],y=nav.ground(wx,wz,1.70,region.id,[],true,.22);
          if(y!==null)p={x:wx,y,z:wz};
        }
      }
      if(!p)throw Error(`No clear space for ${spec.name}`);
      const approach=Array.from({length:16},(_,i)=>({x:p!.x+Math.sin(i*Math.PI/8)*2.5,z:p!.z+Math.cos(i*Math.PI/8)*2.5}))
        .find(a=>nav.ground(a.x,a.z,.4,region.id,[],false,.22)!==null&&nav.route(a,{x:p!.x+(a.x-p!.x)*.76,z:p!.z+(a.z-p!.z)*.76},.35,region.id));
      if(!approach)throw Error(`No safe approach for ${spec.name}`);
      const root=gameStall(spec.id,spec.name,region.color);root.position.set(p.x,p.y,p.z);
      const yaw=Math.atan2(approach.x-p.x,approach.z-p.z);root.rotation.y=yaw;
      // A compact conservative circular collider covers the angled counter and all four posts.
      obstacles.push({x:p.x,z:p.z,radius:1.48,height:p.y+2.7});
      reserved.push({...p,radius:2.05},{...approach,radius:1.15});this.scene.add(root);this.roots.push(root);this.releases.push(batchStatic(root));
      this.stalls.push({...p,id:spec.id,name:spec.name,approach});
    }
    for(const id of ['spring','summer','autumn']){const course=makeCourse(id,data.regions,obstacles);this.courses.set(id,course);reserved.push({...course.spawn,radius:1.6});}
    this.navigation=new LivingNavigation(data.regions,obstacles);
    this.prompt.className='game-near-prompt';this.prompt.hidden=true;this.prompt.onclick=()=>{if(this.near)this.open(this.near.id);};host.append(this.prompt);
    this.dialog.className='seasonal-dialog';this.dialog.setAttribute('aria-label','四季游乐');document.body.append(this.dialog);
    this.hud.className='game-hud';this.hud.hidden=true;host.append(this.hud);this.scene.add(this.routeRoot,this.routeGuide.root);this.routeGuide.root.visible=false;
    const opts={signal:this.events.signal};
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.arc){this.arcadeMenu();return;}if(this.vehicle&&this.race?.finished)this.stop();else if(this.vehicle)this.resume();else this.close();},opts);
    window.addEventListener('keydown',e=>{
      if(e.target instanceof Element&&e.target.closest('input,textarea,select'))return;
      if(!this.busy&&e.code==='KeyV'&&this.near&&!e.repeat&&!this.blocked){e.preventDefault();this.open(this.near.id);return;}
      if(!this.vehicle||this.dialog.open)return;
      if(directionCodes.includes(e.code)){e.preventDefault();this.keys.add(e.code);}
      if(e.code==='KeyR'&&!e.repeat){e.preventDefault();this.reset();}
      if(['Escape','KeyP'].includes(e.code)&&!e.repeat){e.preventDefault();this.pause();}
    },opts);
    window.addEventListener('keyup',e=>this.keys.delete(e.code),opts);
    window.addEventListener('blur',()=>{this.clearInput();if(this.vehicle&&!this.dialog.open&&!this.blocked)this.pause();},opts);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clearInput();if(this.vehicle&&!this.dialog.open&&!this.blocked)this.pause();}},opts);
  }
  get busy(){return !!this.vehicle||this.dialog.open;}
  get driving(){return !!this.vehicle;}
  get observer(){return this.vehicle;}
  get focused(){return !!this.near&&!this.busy;}
  suspend(){this.blocked=true;this.clearInput();}
  private clearInput(){this.keys.clear();this.touch.clear();}
  private mark(){this.host.closest('.main-world')?.classList.toggle('game-active',this.busy);this.host.closest('.main-world')?.classList.toggle('game-driving',this.driving);this.prompt.hidden=this.busy||!this.near;}
  private show(content:string){
    this.loading++;this.hooks.lock();this.clearInput();this.dialog.innerHTML=content;
    this.dialog.classList.remove('game-result-dialog');
    if(!this.dialog.open){this.returnFocus=document.activeElement as HTMLElement;this.dialog.showModal();}
    this.dialog.scrollTop=0;
    this.mark();this.dialog.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private heading(tag:string,title:string,description=''){return `<div class="game-dialog-head"><span class="game-eyebrow">${tag}</span><button data-close aria-label="关闭四季游乐">×</button></div><h2>${title}</h2>${description?`<p class="game-description">${description}</p>`:''}`;}
  open(id?:string){
    if(this.busy)return;this.loading++;this.hooks.lock();
    if(id){this.stallPage(id);return;}this.allGames();
  }
  private stallPage(id:string){
    if(id==='winter'){this.arcadeMenu();return;}
    const spec=gameCatalog.find(s=>s.id===id)!,course=this.courses.get(id)!;
    const best=readBest(this.storage,`race.${id}.${course.version}`);
    this.show(this.heading(spec.tag,spec.name,spec.description)+`<article class="seasonal-card seasonal-detail" data-stall-page="${id}" style="--game-accent:${spec.color}"><div class="game-course-facts"><span>${Math.round(course.length)} m / 圈</span><span>${course.laps} 圈</span><span>最佳 ${formatTime(best??Infinity)}</span></div><details class="game-control-notes"><summary>操作</summary><p>${spec.controls}</p><small>R 复位（罚时 5 秒） · Esc 暂停<br>金牌 ${formatTime(course.medals[0])} · 银牌 ${formatTime(course.medals[1])}</small></details><div><button data-start="${id}">计时挑战</button><button data-free="${id}">自由漫游</button></div></article><div class="game-menu-actions"><button data-all-games>所有游戏</button></div>`);
    this.wireMenu();
  }
  private allGames(){
    this.show(this.heading('四季游乐','选个游戏')+`<div class="seasonal-cards">${gameCatalog.map(s=>{
      const course=this.courses.get(s.id),best=course?readBest(this.storage,`race.${s.id}.${course.version}`):null;
      return `<article class="seasonal-card" style="--game-accent:${s.color}"><span>${s.tag}</span><h3>${s.name}</h3><p>${s.description}</p><small>${s.vehicle}${course?` · ${Math.round(course.length)} m / 圈 · 两圈 · 最佳 ${formatTime(best??Infinity)}`:` · ${arcadeCatalog.length} 款 · 本地纪录`}</small><div>${course?`<button data-start="${s.id}">计时挑战</button><button data-free="${s.id}">自由漫游</button>`:'<button data-arcade>进入游艺室</button>'}</div></article>`;
    }).join('')}</div>`);
    this.wireMenu();
  }
  private wireMenu(){
    this.dialog.querySelector('[data-close]')?.addEventListener('click',()=>this.close());
    this.dialog.querySelector('[data-all-games]')?.addEventListener('click',()=>this.allGames());
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-start],[data-free]').forEach(b=>b.onclick=()=>this.start(b.dataset.start??b.dataset.free!,!!b.dataset.free));
    this.dialog.querySelector('[data-arcade]')?.addEventListener('click',()=>this.arcadeMenu());
  }
  private close(){this.loading++;this.arc?.dispose();this.arc=undefined;this.dialog.close();this.mark();if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});}
  private arcadeMenu(){
    this.loading++;this.arc?.dispose();this.arc=undefined;
    this.show(this.heading('冬','雪夜游艺室')+`<div class="arcade-menu" data-stall-page="winter">${arcadeCatalog.map(g=>`<button data-game="${g.id}"><i>${g.symbol}</i><span><b>${g.name}</b><small>${g.detail}</small><em>最佳 ${readBest(this.storage,arcadeScoreKey(g.id))??'—'} 分</em></span><span>→</span></button>`).join('')}</div><div class="game-menu-actions"><button data-all-games>所有游戏</button></div>`);
    this.wireMenu();
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-game]').forEach(b=>b.onclick=async()=>{
      const request=++this.loading;b.disabled=true;
      try{const {ArcadeRoom}=await import('./arcade-room');if(request!==this.loading||!this.dialog.open)return;
        this.arc=new ArcadeRoom(this.dialog,b.dataset.game!,this.storage,()=>this.arcadeMenu());
      }catch{b.disabled=false;b.textContent='加载失败，点击重试';}
    });
  }
  private start(id:string,leisure:boolean){
    const stall=this.stalls.find(s=>s.id===id)!;
    this.hooks.arrive(stall.approach.x,stall.approach.z,stall.x,stall.z);
    this.race=createRace(this.courses.get(id)!,leisure);this.vehicle=createVehicle(id,this.race.course.spawn);
    this.lastFrame=0;
    this.rig=gameVehicle(id);this.scene.add(this.rig.root);this.cameraReady=false;this.paused=false;this.close();this.buildRoute();
    this.trail=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:id==='spring'?'#d3b994':id==='summer'?'#e9f4e9':'#f0d999',transparent:true,opacity:.65,depthWrite:false}),80);
    this.trail.frustumCulled=false;this.scene.add(this.trail);this.trailSamples=Array.from({length:80},()=>({x:0,y:-50,z:0,age:10,side:0}));this.trailCursor=0;this.trailClock=0;
    const spec=gameCatalog.find(s=>s.id===id)!;
    this.hud.innerHTML=`<div class="game-instruments"><div><small>${spec.tag} · ${leisure?'自由漫游':'计时挑战'}</small><b>${spec.name}</b></div><strong data-time>00:00.00</strong><span data-lap></span><span data-speed></span><div class="game-boost"><i></i></div><button data-pause aria-label="暂停游戏">Ⅱ</button></div><div class="game-navigation"><span data-direction>◇</span><b data-target></b><small data-notice></small></div><div class="game-countdown" role="status" aria-live="polite"><small data-count-label>准备出发</small><b data-count>3</b></div><div class="game-route-map"><canvas width="170" height="140" aria-label="赛道与当前位置"></canvas></div><details class="game-drive-help"><summary>操作</summary><p>${spec.controls}</p><small>R 复位${leisure?'':' +5 秒'} · Esc 暂停</small></details><div class="game-touch-drive" aria-label="载具触屏控制"><div><button data-drive="left" aria-label="向左转">←</button><button data-drive="right" aria-label="向右转">→</button></div><div><button data-drive="brake">刹车</button>${id==='autumn'?'<button data-drive="back">抬升</button><button data-drive="forward">俯冲</button>':'<button data-drive="boost">加速</button><button data-drive="back">倒车</button><button data-drive="forward">油门</button>'}</div></div>`;
    this.hud.querySelector('[data-pause]')!.addEventListener('click',()=>this.pause());
    this.hud.querySelector('[data-pause]')!.insertAdjacentHTML('beforebegin','<button data-reset aria-label="复位到上个信标" title="R · 复位">R</button>');
    this.hud.querySelector('[data-reset]')!.addEventListener('click',()=>this.reset());
    if(id==='spring'){
      const drift=this.hud.querySelector<HTMLButtonElement>('[data-drive="boost"]')!;drift.dataset.drive='drift';drift.textContent='漂移';
      drift.insertAdjacentHTML('afterend','<button data-drive="boost">加速</button>');
    }
    this.hud.querySelectorAll<HTMLButtonElement>('[data-drive]').forEach(b=>{
      b.addEventListener('pointerdown',e=>{e.preventDefault();if(e.button!==0||this.paused)return;b.setPointerCapture(e.pointerId);this.touch.set(e.pointerId,b.dataset.drive!);});
      const release=(e:PointerEvent)=>this.touch.delete(e.pointerId);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
    });
    this.hud.hidden=false;this.updateHud();this.mark();this.hooks.sound();
  }
  private buildRoute(){
    this.clearRoute();if(!this.race)return;
    const {course,leisure}=this.race;
    if(!leisure){
      course.gates.forEach((g,i)=>{
        const geo=course.id==='autumn'?new T.TorusGeometry(g.radius,.12,6,48):new T.TorusGeometry(g.radius,.065,6,36,Math.PI);
        const gate=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#e0c685',transparent:true,opacity:0,depthWrite:false}));gate.visible=false;gate.position.set(g.x,g.y+(course.id==='summer'?.15:0),g.z);gate.rotation.y=Math.atan2(g.nx,g.nz);gate.userData.index=i;this.routeRoot.add(gate);this.gateMeshes.push(gate);
      });
    }
    if(course.id==='autumn')for(const t of thermals){
      const positions=new Float32Array(30*3);
      for(let i=0;i<30;i++){const a=i*2.399;positions.set([Math.cos(a)*t.radius*.22,6+i/30*38,Math.sin(a)*t.radius*.22],i*3);}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
      const gust=new T.Points(geometry,new T.PointsMaterial({color:'#efd291',size:.18,transparent:true,opacity:.58,depthWrite:false}));gust.position.set(t.x,0,t.z);gust.name='thermal';this.routeRoot.add(gust);
    }
  }
  private clearRoute(){
    this.routeRoot.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});
    this.routeRoot.clear();this.gateMeshes=[];this.routeGuide.reset();
  }
  private reset(){
    if(!this.vehicle||!this.race||this.paused||this.race.finished||this.race.countdown>0)return;
    this.vehicle=createVehicle(this.vehicle.kind,resetRaceVehicle(this.race));this.lastFrame=0;this.cameraReady=false;this.clearInput();this.updateHud();
  }
  private pause(){
    if(!this.vehicle||this.race?.finished)return;this.paused=true;
    this.show(this.heading('游戏','已暂停')+'<div class="game-menu-actions"><button data-resume>继续</button><button data-restart>重新开始</button><button data-exit>回到摊位</button></div>');
    this.dialog.querySelector('[data-close]')!.addEventListener('click',()=>this.resume());this.dialog.querySelector('[data-resume]')!.addEventListener('click',()=>this.resume());
    this.dialog.querySelector('[data-restart]')!.addEventListener('click',()=>{const id=this.vehicle!.kind,leisure=this.race!.leisure;this.stop();this.start(id,leisure);});this.dialog.querySelector('[data-exit]')!.addEventListener('click',()=>this.stop());
  }
  private resume(){this.close();this.paused=false;this.lastFrame=performance.now();this.clearInput();}
  stop(){
    if(!this.vehicle){this.close();return;}
    const stall=this.stalls.find(s=>s.id===this.vehicle!.kind)!;
    this.close();this.vehicle=null;this.race=null;this.paused=false;this.hud.hidden=true;this.clearInput();this.clearRoute();
    if(this.rig)releaseGameObject(this.rig.root);this.rig=null;this.clearTrail();this.clearEffects();this.mark();
    this.hooks.arrive(stall.approach.x,stall.approach.z,stall.x,stall.z);
  }
  private finish(){
    const race=this.race!,grade=raceGrade(race),total=race.elapsed+race.penalty;
    const result=saveBest(this.storage,`race.${race.course.id}.${race.course.version}`,total,true),labels={gold:'金牌',silver:'银牌',bronze:'完成比赛'};
    this.celebrate(grade);this.show(this.heading('成绩',labels[grade])+`<div class="game-finish" data-grade="${grade}"><strong>${formatTime(total)}</strong><span>${result.record?'新纪录':'最佳 '+formatTime(result.best??Infinity)}</span><small>用时 ${formatTime(race.elapsed)} · 罚时 ${race.penalty} 秒</small><small>${result.saved?'已保存':'未能保存'}</small></div><div class="game-menu-actions"><button data-again>再来一局</button><button data-roam>自由漫游</button><button data-exit>回到摊位</button></div>`);
    this.dialog.classList.add('game-result-dialog');
    this.dialog.querySelector('[data-close]')!.addEventListener('click',()=>this.stop());
    for(const key of ['again','roam'])this.dialog.querySelector(`[data-${key}]`)!.addEventListener('click',()=>{const id=race.course.id;this.stop();this.start(id,key==='roam');});
    this.dialog.querySelector('[data-exit]')!.addEventListener('click',()=>this.stop());
  }
  private celebrate(grade:string){
    this.clearEffects();this.effectKind=grade;this.effectTime=0;const count=matchMedia('(prefers-reduced-motion: reduce)').matches?24:grade==='gold'?210:grade==='silver'?100:36;
    const positions=new Float32Array(count*3),colors=new Float32Array(count*3),p=this.vehicle!;
    for(let i=0;i<count;i++){const a=i*2.399,r=.5+Math.random()*2.8,s=grade==='gold'?3:grade==='silver'?1.6:.7;
      this.particles.push(Math.cos(a)*r*s,(2+Math.random()*3)*s,Math.sin(a)*r*s);
      positions.set([p.x,p.y+3,p.z],i*3);const color=new T.Color(['#dbb55e','#cb8177','#93b7b4','#fff0c9'][i%4]);colors.set([color.r,color.g,color.b],i*3);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('color',new T.BufferAttribute(colors,3));
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;
    if(grade==='silver'){
      ctx.fillStyle='#ffffff';ctx.beginPath();
      for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?6:30;const x=32+Math.cos(a)*r,y=32+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
    }else{const glow=ctx.createRadialGradient(32,32,0,32,32,32);glow.addColorStop(0,'#fff');glow.addColorStop(.3,'#fffffff0');glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);}
    const texture=new T.CanvasTexture(canvas);
    this.effects=new T.Points(geo,new T.PointsMaterial({size:grade==='gold'?.48:grade==='silver'?.60:.18,map:texture,vertexColors:true,transparent:true,depthWrite:false}));this.effects.frustumCulled=false;this.scene.add(this.effects);
  }
  private clearEffects(){if(this.effects){this.effects.geometry.dispose();(this.effects.material as T.PointsMaterial).map?.dispose();(this.effects.material as T.Material).dispose();this.effects.removeFromParent();}this.effects=undefined;this.particles=[];}
  private clearTrail(){if(this.trail){this.trail.geometry.dispose();(this.trail.material as T.Material).dispose();this.trail.removeFromParent();}this.trail=undefined;this.trailSamples=[];}
  private updateTrail(dt:number,reduced:boolean){
    if(!this.trail||!this.vehicle)return;const s=this.vehicle;this.trail.visible=!reduced;this.trailClock+=dt;
    if(!reduced&&Math.abs(s.speed)>1&&this.trailClock>.045){
      this.trailClock=0;
      for(const side of [-1,1]){
        const width=s.kind==='autumn'?3.4:s.kind==='summer'?.62:.1,back=s.kind==='autumn'?0:1;
        this.trailSamples[this.trailCursor++%80]={x:s.x+Math.cos(s.yaw)*width*side-Math.sin(s.yaw)*back,y:s.y+(s.kind==='autumn'?2.2:s.kind==='summer'?.04:.08),z:s.z-Math.sin(s.yaw)*width*side-Math.cos(s.yaw)*back,age:0,side};
      }
    }
    this.trailSamples.forEach((p,i)=>{
      p.age+=dt;const life=s.kind==='autumn'?1.3:1.8,size=Math.max(0,1-p.age/life)*(s.kind==='summer'?.15:s.kind==='spring'?.09:.035);
      this.transform.position.set(p.x,p.y+(s.kind==='spring'?p.age*.15:0),p.z);this.transform.scale.setScalar(size);this.transform.updateMatrix();this.trail!.setMatrixAt(i,this.transform.matrix);
    });this.trail.instanceMatrix.needsUpdate=true;
  }
  update(dt:number,player:Point,camera:T.PerspectiveCamera,available:boolean,externalPaused:boolean,reduced:boolean){
    const now=performance.now(),raceDelta=this.lastFrame?Math.max(0,(now-this.lastFrame)/1000):0;this.lastFrame=now;
    this.blocked=!available;this.time+=dt;
    if(!this.busy){
      const near=available?this.stalls.find(s=>Math.hypot(player.x-s.x,player.z-s.z)<3.5&&Math.abs(player.y-s.y)<1):undefined;
      if(near?.id!==this.near?.id){this.near=near??null;this.prompt.textContent=near?`V · ${near.name} · 游玩`:'';this.prompt.hidden=!near;}
    }
    if(!this.vehicle||!this.race||!this.rig)return;
    const s=this.vehicle,race=this.race,canMove=!this.paused&&!externalPaused&&!race.finished,previous={x:s.x,y:s.y,z:s.z};
    if(externalPaused)this.clearInput();
    const pressed=(action:string,...keys:string[])=>[...this.touch.values()].includes(action)||keys.some(k=>this.keys.has(k));
    const input={throttle:Number(pressed('forward','KeyW','ArrowUp'))-Number(pressed('back','KeyS','ArrowDown')),turn:Number(pressed('left','KeyA','ArrowLeft'))-Number(pressed('right','KeyD','ArrowRight')),brake:pressed('brake','Space'),drift:s.kind==='spring'&&pressed('drift','ShiftLeft','ShiftRight'),boost:s.kind==='spring'?pressed('boost','KeyE'):pressed('boost','ShiftLeft','ShiftRight')};
    if(canMove){
      if(race.countdown<=0)advanceVehicle(s,input,dt,this.data.regions,[...this.navigation.nearby(s.x,s.z,7),...(s.kind==='spring'?this.hooks.dynamic():[])],this.time);
      const passed=advanceRace(race,previous,s,race.countdown>0?Math.min(.1,raceDelta):raceDelta);if(passed)this.hooks.sound();
      if(s.kind==='autumn'&&s.hit&&!race.finished){this.reset();this.updateHud();return;}
      if(race.finished)this.finish();
    }
    const visualY=s.y+s.stepOffset;
    this.rig.root.position.set(s.x,visualY,s.z);this.rig.root.rotation.y=s.yaw;this.rig.animate(s.speed,reduced||s.hit?0:s.bank,s.pitch,canMove?dt:0,canMove?input.turn:0);
    this.updateTrail(canMove&&race.countdown<=0?dt:0,reduced);
    const distance=s.kind==='autumn'?10:s.kind==='summer'?8:5,height=s.kind==='autumn'?4:s.kind==='summer'?3.7:2.8;
    const target=new T.Vector3(s.x-Math.sin(s.yaw)*distance,visualY+height,s.z-Math.cos(s.yaw)*distance);
    if(onGround(target.x,target.z,this.data.regions))target.y=Math.max(target.y,groundHeight(target.x,target.z,this.data.regions)+1.1);
    // Pull the chase camera in front of walls instead of looking through an exhibit.
    for(let i=1;i<=10;i++){
      const t=i/10,x=s.x+(target.x-s.x)*t,z=s.z+(target.z-s.z)*t,y=s.y+1.3+(target.y-s.y-1.3)*t;
      if([...this.navigation.nearby(x,z,1)].some(o=>y<(o.height??Infinity)&&overlaps(x,z,o,.2))){const f=Math.max(.12,t-.12);target.set(s.x+(target.x-s.x)*f,s.y+height,s.z+(target.z-s.z)*f);break;}
    }
    if(!this.cameraReady){camera.position.copy(target);this.cameraReady=true;}else camera.position.lerp(target,1-Math.exp(-dt*8));
    camera.lookAt(s.x+Math.sin(s.yaw)*2,visualY+1.1,s.z+Math.cos(s.yaw)*2);
    this.routeGuide.update(race,s,canMove&&race.countdown===0?dt:0,reduced);
    this.gateMeshes.forEach((m,i)=>{const opacity=gateVisibility(race.next,i,race.course.gates.length,race.finished);m.visible=opacity>0;(m.material as T.MeshBasicMaterial).opacity=opacity;(m.material as T.MeshBasicMaterial).color.set(i===race.next?'#ffcc66':'#91aaa0');});
    for(const o of this.routeRoot.children)if(o.name==='thermal'){
      o.visible=Math.hypot(o.position.x-s.x,o.position.z-s.z)<22;
      if(!reduced&&canMove&&o instanceof T.Points){
        o.rotation.y+=dt*.16;const p=o.geometry.attributes.position;
        for(let i=0;i<p.count;i++)p.setY(i,6+(p.getY(i)-6+dt*3)%38);p.needsUpdate=true;
      }
    }
    if(this.effects){
      this.effectTime+=dt;const positions=this.effects.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const fireworks=this.effectKind==='gold',delay=fireworks?(i%3)*.42:0,t=Math.max(0,this.effectTime-delay),burst=fireworks?Math.max(0,t-.48):t,base=fireworks?3+Math.min(.48,t)*13:2;
        positions.setXYZ(i,s.x+this.particles[i*3]*burst,s.y+base+this.particles[i*3+1]*burst-(fireworks?3:1.4)*burst*burst,s.z+this.particles[i*3+2]*burst);
      }
      positions.needsUpdate=true;(this.effects.material as T.PointsMaterial).opacity=Math.max(0,1-this.effectTime/5);
      if(this.effectTime>5)this.clearEffects();
    }
    this.uiTime+=dt;if(this.uiTime>.08){this.uiTime=0;this.updateHud();}
  }
  private updateHud(){
    const race=this.race!,s=this.vehicle!,g=race.course.gates[race.next],distance=Math.hypot(s.x-g.x,s.z-g.z);
    this.hud.querySelector('[data-time]')!.textContent=formatTime(race.elapsed);
    this.hud.querySelector('[data-lap]')!.textContent=race.leisure?'随风而行':`${race.lap} / ${race.course.laps} 圈`;
    this.hud.querySelector('[data-speed]')!.textContent=`${Math.round((race.countdown>0?0:Math.abs(s.speed))*3.6)} km/h${s.kind==='autumn'?` · ${Math.round(s.y+5.65)} m`:''}`;
    this.hud.querySelector<HTMLElement>('.game-boost')!.hidden=s.kind==='autumn';this.hud.querySelector<HTMLElement>('.game-boost i')!.style.width=`${s.boost*100}%`;
    const countdown=this.hud.querySelector<HTMLElement>('.game-countdown')!,text=race.countdown>0?String(Math.ceil(race.countdown)):race.elapsed<.6?'出发':'';
    countdown.hidden=!text;countdown.querySelector('[data-count]')!.textContent=text;countdown.querySelector<HTMLElement>('[data-count-label]')!.hidden=race.countdown<=0;
    this.hud.querySelector('[data-target]')!.textContent=race.leisure?s.kind==='autumn'?'寻找金色上升气流':s.kind==='summer'?'随海风远行':'随心骑行':`信标 ${race.next+1} / ${race.course.gates.length} · ${Math.round(distance)} m`;
    const arrow=this.hud.querySelector<HTMLElement>('[data-direction]')!;arrow.hidden=race.leisure;arrow.textContent='↑';arrow.style.transform=`rotate(${-angleDiff(s.yaw,Math.atan2(g.x-s.x,g.z-s.z))}rad)`;
    this.hud.querySelector('[data-notice]')!.textContent=s.hit?s.kind==='autumn'?'转向避开障碍':'倒车或转向离开':race.leisure?this.touchExperience?'右上角暂停':'Esc 暂停':race.penalty?`罚时 +${race.penalty} 秒`:'按顺序通过';
    const canvas=this.hud.querySelector<HTMLCanvasElement>('canvas')!,ctx=canvas.getContext('2d')!,points=race.course.path;
    ctx.clearRect(0,0,170,140);
    if(race.leisure){ctx.fillStyle='#746956';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('自由漫游',85,64);ctx.fillText('暂停后可返回摊位',85,86);return;}
    const xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),minZ=Math.min(...zs),scale=Math.min(140/(Math.max(...xs)-minX),110/(Math.max(...zs)-minZ));
    const point=(p:{x:number;z:number})=>({x:15+(p.x-minX)*scale,y:15+(p.z-minZ)*scale});
    ctx.globalAlpha=.25;ctx.strokeStyle='#a69a80';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{const v=point(p);if(i)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);});ctx.stroke();ctx.globalAlpha=1;
    const guide=guidanceWindow(race,s);ctx.strokeStyle='#bf724e';ctx.lineWidth=3;ctx.beginPath();guide.forEach((p,i)=>{const v=point(p);if(i)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);});ctx.stroke();
    race.course.gates.forEach((p,i)=>{const opacity=gateVisibility(race.next,i,race.course.gates.length,race.finished);if(!opacity)return;const v=point(p);ctx.globalAlpha=opacity;ctx.fillStyle=i===race.next?'#bf724e':'#999d86';ctx.beginPath();ctx.arc(v.x,v.y,i===race.next?5:2,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    const v=point(s);ctx.fillStyle='#345f61';ctx.beginPath();ctx.arc(v.x,v.y,4,0,Math.PI*2);ctx.fill();
  }
  get snapshot(){return {stalls:this.stalls,vehicle:this.vehicle?{...this.vehicle}:null,race:this.race?{...this.race}:null,paused:this.paused,arcade:this.arc?.snapshot??null,near:this.near?.id??null,guide:this.routeGuide.snapshot,gates:this.gateMeshes.filter(m=>m.visible).map(m=>({index:m.userData.index,opacity:(m.material as T.MeshBasicMaterial).opacity}))};}
  dispose(){this.loading++;this.arc?.dispose();this.events.abort();this.clearRoute();this.routeRoot.removeFromParent();this.routeGuide.dispose();this.clearEffects();this.clearTrail();if(this.rig)releaseGameObject(this.rig.root);this.releases.forEach(f=>f());this.roots.forEach(r=>r.removeFromParent());this.dialog.remove();this.hud.remove();this.prompt.remove();}
}
