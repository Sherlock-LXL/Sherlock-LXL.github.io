import {Arcade,arcadeCatalog,arcadeScoreKey,mergeDuration,pairsHealth} from '../../shared/arcade.mjs';
import {readBest,saveBest} from '../../shared/seasonal-games.mjs';
import {orbRadii,orbNames} from '../../shared/falling-merge.mjs';

const colors=['#ede4d2','#769b9c','#cdaf66','#b87a88','#83a787','#6b88a0','#bc8065','#a491b6'];
const symbols=['✿','❄','☀','☾','♧','♫','◇','✦'];
const mapping:Record<string,string>={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'space'};
export class ArcadeRoom{
  private game:Arcade;private canvas:HTMLCanvasElement;private ctx:CanvasRenderingContext2D;private status:HTMLElement;private result:HTMLElement;
  private paused=false;private recorded=false;private events=new AbortController();private held=new Set<string>();private repeat=0;private last=0;private frame=0;
  private pointers=new Map<number,string>();private dragPointer:number|null=null;
  private mouseActive=false;private mouseLocked=false;
  private score=-1;private best:number|null;private drag:{x:number;y:number}|null=null;
  constructor(private host:HTMLElement,private id:string,private storage:Storage,back:()=>void){
    const spec=arcadeCatalog.find(g=>g.id===id)!;this.game=new Arcade(id);this.best=readBest(storage,arcadeScoreKey(id));
    host.innerHTML=`<div class="game-dialog-head"><span class="game-eyebrow">雪夜游艺室</span><button data-back aria-label="返回小游戏列表">← 返回</button></div><h2>${spec.name}</h2><p class="game-description">${spec.hint}</p><div class="arcade-layout"><div class="arcade-stage"><canvas width="480" height="480" tabindex="0" aria-label="${spec.name}游戏画面"></canvas><div class="arcade-result" role="status" hidden></div></div><div class="arcade-side"><div class="arcade-score" aria-live="off"></div><div class="arcade-actions"><button data-pause>暂停</button><button data-restart>重新开始</button></div><div class="arcade-pad" aria-label="游戏触屏操作"><button data-key="up" aria-label="向上或旋转">↑</button><button data-key="left" aria-label="向左">←</button><button data-key="down" aria-label="向下">↓</button><button data-key="right" aria-label="向右">→</button><button data-key="space">${id==='bricks'?'发球':'直接落下'}</button></div><div class="arcade-cards" aria-label="翻牌选择"></div><small>P 暂停 · Esc 返回</small></div></div>`;
    this.canvas=host.querySelector('canvas')!;this.ctx=this.canvas.getContext('2d')!;this.status=host.querySelector('.arcade-score')!;this.result=host.querySelector('.arcade-result')!;
    const opts={signal:this.events.signal};
    host.querySelector('[data-back]')!.addEventListener('click',back,opts);
    host.querySelector('[data-pause]')!.addEventListener('click',()=>this.pause(!this.paused),opts);
    host.querySelector('[data-restart]')!.addEventListener('click',()=>{this.store();this.game=new Arcade(id);this.recorded=false;this.result.hidden=true;this.score=-1;this.pause(false);},opts);
    const pad=host.querySelector<HTMLElement>('.arcade-pad')!;pad.hidden=id==='pairs';
    if(!['blocks','bricks','falling'].includes(id))pad.querySelector<HTMLElement>('[data-key="space"]')!.hidden=true;
    if(id==='bricks'||id==='falling')for(const key of ['up','down'])pad.querySelector<HTMLElement>(`[data-key="${key}"]`)!.hidden=true;
    if(id==='falling')pad.querySelector<HTMLElement>('[data-key="space"]')!.textContent='投下小球';
    host.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button=>{
      button.addEventListener('pointerdown',e=>{e.preventDefault();if(this.paused||e.button!==0)return;button.setPointerCapture(e.pointerId);const key=button.dataset.key!;this.press(key);this.pointers.set(e.pointerId,key);this.repeat=.20;},opts);
      button.addEventListener('click',e=>{if(e.detail===0)this.press(button.dataset.key!);},opts);
      const release=(e:PointerEvent)=>this.pointers.delete(e.pointerId);button.addEventListener('pointerup',release,opts);button.addEventListener('pointercancel',release,opts);button.addEventListener('lostpointercapture',release,opts);
    });
    const cards=host.querySelector<HTMLElement>('.arcade-cards')!;cards.hidden=id!=='pairs';
    if(id==='pairs'){cards.innerHTML=Array.from({length:16},(_,i)=>`<button data-card="${i}" aria-label="翻开第 ${i+1} 张卡片">${i+1}</button>`).join('');cards.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-card]');if(b&&!this.paused)this.game.flip(Number(b.dataset.card));},opts);}
    this.canvas.addEventListener('pointerdown',e=>{
      if(this.paused||this.game.over||e.button!==0||this.dragPointer!==null)return;
      this.canvas.focus();const p=this.point(e);
      if(id==='bricks'&&e.pointerType==='mouse'){
        if(!this.mouseActive)this.game.paddle=Math.max(.1,Math.min(.9,p.x));
        this.mouseActive=true;this.canvas.style.cursor='none';this.press('space');
        if(document.pointerLockElement!==this.canvas)try{this.canvas.requestPointerLock()?.catch(()=>{});}catch{}
        return;
      }
      this.canvas.setPointerCapture(e.pointerId);this.drag=p;this.dragPointer=e.pointerId;
      if(id==='bricks'){this.game.paddle=Math.max(.1,Math.min(.9,p.x));this.press('space');}
      if(this.game.falling)this.game.falling.aim=p.x;
      if(id==='pairs')this.game.flip(Math.floor(p.y*4)*4+Math.floor(p.x*4));
    },opts);
    this.canvas.addEventListener('pointermove',e=>{
      if(this.paused)return;const x=this.point(e).x;
      if(id==='bricks'&&(this.mouseActive||e.pointerId===this.dragPointer&&this.drag)){
        const paddle=document.pointerLockElement===this.canvas?this.game.paddle+e.movementX/this.canvas.getBoundingClientRect().width:x;
        this.game.paddle=Math.max(.1,Math.min(.9,paddle));
      }
      if(this.game.falling&&(this.dragPointer===null||e.pointerId===this.dragPointer))this.game.falling.aim=x;
    },opts);
    document.addEventListener('pointerlockchange',()=>{
      const locked=document.pointerLockElement===this.canvas;
      if(this.mouseLocked&&!locked&&this.mouseActive)this.pause(true);
      this.mouseLocked=locked;
    },opts);
    this.canvas.addEventListener('pointerup',e=>{if(e.pointerId!==this.dragPointer)return;if(this.drag&&id==='merge'){const p=this.point(e),dx=p.x-this.drag.x,dy=p.y-this.drag.y;if(Math.hypot(dx,dy)>.06)this.press(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');}if(id==='falling')this.press('space');this.drag=null;this.dragPointer=null;},opts);
    const cancelDrag=(e:PointerEvent)=>{if(e.pointerId===this.dragPointer){this.drag=null;this.dragPointer=null;}};
    this.canvas.addEventListener('pointercancel',cancelDrag,opts);this.canvas.addEventListener('lostpointercapture',cancelDrag,opts);
    window.addEventListener('keydown',e=>{
      if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();back();return;}
      if(e.code==='KeyP'&&!e.repeat){e.preventDefault();this.pause(!this.paused);return;}
      if(e.code==='Space'&&e.target instanceof HTMLButtonElement)return;
      const key=mapping[e.code];if(!key)return;e.preventDefault();if(!e.repeat){this.press(key);this.held.add(key);this.repeat=.20;}
    },{...opts,capture:true});
    window.addEventListener('keyup',e=>this.held.delete(mapping[e.code]),opts);
    window.addEventListener('blur',()=>this.pause(true),opts);document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause(true);},opts);
    this.canvas.focus();this.frame=requestAnimationFrame(this.animate);
  }
  private point(e:PointerEvent){const b=this.canvas.getBoundingClientRect();return {x:Math.min(.999,Math.max(0,(e.clientX-b.left)/b.width)),y:Math.min(.999,Math.max(0,(e.clientY-b.top)/b.height))};}
  private press(key:string){if(!this.paused)this.game.action(key);}
  private releaseMouse(){this.mouseActive=false;this.mouseLocked=false;this.canvas.style.cursor='';if(document.pointerLockElement===this.canvas)document.exitPointerLock();}
  private pause(value:boolean){this.paused=value;this.releaseMouse();this.held.clear();this.pointers.clear();this.game.axis=0;this.drag=null;this.dragPointer=null;this.host.querySelector('[data-pause]')!.textContent=value?'继续':'暂停';}
  private store(){if(this.recorded)return;const r=saveBest(this.storage,arcadeScoreKey(this.id),this.game.score);this.best=r.best;this.recorded=this.game.over;return r;}
  private animate=(time:number)=>{
    this.frame=requestAnimationFrame(this.animate);const dt=this.last?Math.min(.1,(time-this.last)/1000):0;this.last=time;
    if(!this.paused){
      const held=new Set([...this.held,...this.pointers.values()]);
      this.repeat-=dt;
      if(this.repeat<=0){this.repeat=.09;if(this.id==='blocks')for(const key of held)if(['left','right','down'].includes(key))this.press(key);}
      this.game.axis=Number(held.has('right'))-Number(held.has('left'));this.game.update(dt);
    }
    if(this.game.over&&!this.recorded&&this.game.mergeAge>=mergeDuration){this.releaseMouse();const r=this.store();this.result.hidden=false;this.result.innerHTML=`<b>${this.game.won&&this.id!=='merge'?'完成':'本局结束'}</b><span>${this.game.score} 分${r?.record?' · 新纪录':''}</span><small>${r?.saved?'已保存':'未能保存'}</small>`;}
    if(this.game.score!==this.score||['pairs','bricks','blocks','falling'].includes(this.id)){
      this.score=this.game.score;this.status.innerHTML=`<small>得分</small><strong>${this.score}</strong><span>最佳 ${this.best??'—'}</span><small>${this.id==='blocks'?`已消除 ${this.game.lines} 行`:this.id==='bricks'?`${this.game.lives} 次机会 · 球速 ${(this.game.ballSpeed/.6).toFixed(1)}×`:this.id==='pairs'?`第 ${this.game.boards+(this.game.boardDelay?0:1)} 面 · 已完成 ${this.game.boards} 面`:this.game.falling?`最大 ${orbNames[this.game.falling.highest]}<br>接下来 ${orbNames[this.game.falling.next[0]]} → ${orbNames[this.game.falling.next[1]]}`:this.id==='merge'&&this.game.won?'已达 2048':''}</small>${this.id==='pairs'?`<div class="pairs-health" role="meter" aria-label="剩余血量" aria-valuemin="0" aria-valuemax="${pairsHealth}" aria-valuenow="${this.game.health}"><i style="width:${this.game.health/pairsHealth*100}%"></i></div><small>血量 ${this.game.health} / ${pairsHealth}</small>`:''}`;
    }
    this.draw();
  };
  private draw(){
    const c=this.ctx,g=this.game,w=480;c.fillStyle='#f3eddf';c.fillRect(0,0,w,w);
    const cell=(x:number,y:number,s:number,color:string,label='')=>{c.fillStyle=color;c.beginPath();c.roundRect(x+2,y+2,s-4,s-4,Math.min(8,s*.15));c.fill();if(label){c.fillStyle='#332e29';c.textAlign='center';c.textBaseline='middle';c.font=`600 ${s*.32}px "Georgia","Songti SC",serif`;c.fillText(label,x+s/2,y+s/2,s-12);}};
    if(this.id==='blocks'){
      c.fillStyle='#e0d8c9';c.fillRect(96,0,240,480);
      g.board.forEach((r,y)=>r.forEach((v,x)=>cell(96+x*24,y*24,24,colors[v])));
      let ghost=g.py;while(g.fits(g.shape,g.px,ghost+1))ghost++;
      c.globalAlpha=.23;g.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v)cell(96+(g.px+x)*24,(ghost+y)*24,24,colors[v]);}));c.globalAlpha=1;
      g.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v)cell(96+(g.px+x)*24,(g.py+y)*24,24,colors[v]);}));
      c.fillStyle='#6a6255';c.font='14px sans-serif';c.textAlign='left';c.fillText('下一块',354,30);g.next.forEach((r,y)=>r.forEach((v,x)=>{if(v)cell(350+x*23,48+y*23,23,colors[v]);}));
    }else if(this.id==='snake'){
      for(let i=0;i<256;i++)cell(i%16*30,Math.floor(i/16)*30,30,'#e8e1d0');
      g.snake.forEach((p,i)=>cell(p.x*30,p.y*30,30,i?'#83a787':'#426f61'));cell(g.food.x*30,g.food.y*30,30,'#bb7367','✿');
      const h=g.snake[0];c.fillStyle='#fff8e7';c.beginPath();c.arc(h.x*30+12,h.y*30+12,3,0,Math.PI*2);c.arc(h.x*30+22,h.y*30+12,3,0,Math.PI*2);c.fill();
    }else if(this.id==='merge'){
      for(let y=0;y<4;y++)for(let x=0;x<4;x++)cell(x*120,y*120,120,'#e6ddcc');
      const age=matchMedia('(prefers-reduced-motion: reduce)').matches?mergeDuration:g.mergeAge,t=Math.min(1,age/.085),ease=1-(1-t)**3;
      const tile=(x:number,y:number,v:number,scale=1)=>{const size=120*scale;cell(x*120+(120-size)/2,y*120+(120-size)/2,size,colors[1+(Math.log2(v)-1)%7],String(v));};
      if(t<1)g.tiles.forEach(p=>tile(p.fromX+(p.x-p.fromX)*ease,p.fromY+(p.y-p.fromY)*ease,p.value));
      else g.board.forEach((r,y)=>r.forEach((v,x)=>{
        if(!v)return;
        const fresh=g.newTile?.x===x&&g.newTile?.y===y,merged=g.merges.some(p=>p.x===x&&p.y===y),progress=Math.min(1,Math.max(0,(age-.085)/.035));
        tile(x,y,v,fresh?.7+.3*progress:merged?1+.05*Math.sin(progress*Math.PI):1);
      }));
    }
    else if(this.id==='pairs'){
      g.cards.forEach((v,i)=>{const shown=g.open.includes(i)||g.matched.includes(i);cell(i%4*120,Math.floor(i/4)*120,120,g.matched.includes(i)?'#9fba9e':shown?'#e0be86':'#c5d4ce',shown?symbols[v]:'✧');});
      this.host.querySelectorAll<HTMLButtonElement>('[data-card]').forEach((b,i)=>{const shown=g.open.includes(i)||g.matched.includes(i);b.textContent=shown?symbols[g.cards[i]]:String(i+1);b.disabled=g.matched.includes(i);b.setAttribute('aria-label',`${i+1} 号卡片${shown?' '+symbols[g.cards[i]]:''}`);});
    }else if(g.falling){
      const game=g.falling;
      c.strokeStyle='#ad9b7d';c.lineWidth=3;c.beginPath();c.moveTo(.07*w,.22*w);c.lineTo(.07*w,.94*w);c.quadraticCurveTo(.5*w,.96*w,.93*w,.94*w);c.lineTo(.93*w,.22*w);c.stroke();
      c.strokeStyle=game.overflow>0?'#bd6e58':'#ceb9a1';c.setLineDash([5,7]);c.beginPath();c.moveTo(.085*w,.20*w);c.lineTo(.915*w,.20*w);c.stroke();c.setLineDash([]);
      const orb=(x:number,y:number,r:number,level:number,scale=1,squash=0)=>{
        r*=scale;const px=x*w,py=y*w,radius=r*w;
        c.save();c.translate(px,py);c.scale(1+squash,1-squash);
        c.fillStyle=colors[1+level%7];c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.fill();
        c.strokeStyle='#796c5355';c.lineWidth=1.3;c.stroke();c.fillStyle='#fff7e8a0';c.beginPath();c.ellipse(-radius*.28,-radius*.32,radius*.26,radius*.14,-.4,0,Math.PI*2);c.fill();
        c.fillStyle='#494332';c.textAlign='center';c.textBaseline='middle';c.font=`500 ${Math.max(12,radius*.77)}px "Songti SC",serif`;c.fillText(orbNames[level],0,radius*.12);c.restore();
      };
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      for(const b of game.balls)orb(b.x,b.y,b.r,b.level,reduced?1:1+.07*Math.max(0,1-b.wait/.08)*Math.sin(b.wait/.08*Math.PI),reduced?0:b.pulse);
      const radius=orbRadii[game.next[0]],aim=Math.max(.07+radius,Math.min(.93-radius,game.aim));
      c.globalAlpha=game.ready?1:.45;orb(aim,.085,radius,game.next[0]);c.globalAlpha=1;
      c.strokeStyle='#9b886e66';c.setLineDash([3,6]);c.beginPath();c.moveTo(aim*w,(.085+radius)*w);c.lineTo(aim*w,.91*w);c.stroke();c.setLineDash([]);
      if(!reduced)for(const e of game.effects){c.strokeStyle=`rgba(181,135,65,${(1-e.age/.3)*(e.kind==='hit'?.65:1)})`;c.lineWidth=e.kind==='hit'?2:3;c.beginPath();c.arc(e.x*w,e.y*w,e.r*w*(1+e.age*3),0,Math.PI*2);c.stroke();}
    }else{
      for(const b of g.bricks){c.globalAlpha=Math.min(1,b.age/.3);c.fillStyle=colors[b.tone];c.beginPath();c.roundRect(b.x*480,b.y*480,.11*480,.036*480,3);c.fill();}c.globalAlpha=1;
      c.strokeStyle='#b87865';c.setLineDash([5,5]);c.beginPath();c.moveTo(12,.8*480);c.lineTo(468,.8*480);c.stroke();c.setLineDash([]);
      c.fillStyle='#467c76';c.beginPath();c.roundRect((g.paddle-.1)*480,.88*480,.2*480,12,6);c.fill();
      c.fillStyle='#ba785a';c.beginPath();c.arc(g.ball.x*480,g.ball.y*480,7,0,Math.PI*2);c.fill();
      if(g.serving){c.fillStyle='#6a6255';c.textAlign='center';c.font='18px sans-serif';c.fillText('空格 / 点击画面发球',240,300);}
    }
    if(this.paused){c.fillStyle='#f3eddfdf';c.fillRect(0,0,w,w);c.fillStyle='#514c42';c.textAlign='center';c.font='28px serif';c.fillText('已暂停',240,240);}
  }
  get snapshot(){return {id:this.id,score:this.game.score,over:this.game.over,paused:this.paused,won:this.game.won,health:this.game.health,boards:this.game.boards,boardDelay:this.game.boardDelay,mouseActive:this.mouseActive,lines:this.game.lines,moves:this.game.moves,time:this.game.time,piece:{x:this.game.px,y:this.game.py},paddle:this.game.paddle,flips:this.game.flips,rows:this.game.rows,rowProgress:this.game.rowTravel,rowSpeed:this.game.rowSpeed,ballSpeed:this.game.ballSpeed,ball:{...this.game.ball},snake:this.game.snake.map(p=>({...p})),mergeAge:this.game.mergeAge,board:this.game.board,falling:this.game.falling?{drops:this.game.falling.drops,highest:this.game.falling.highest,next:[...this.game.falling.next],balls:this.game.falling.balls.map(b=>({...b})),cooldown:this.game.falling.cooldown,overflow:this.game.falling.overflow}:null};}
  dispose(){this.releaseMouse();this.store();cancelAnimationFrame(this.frame);this.events.abort();}
}
