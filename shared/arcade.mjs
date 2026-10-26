import {clamp} from './seasonal-games.mjs';
import {FallingMerge} from './falling-merge.mjs';
export const arcadeCatalog=[
  {id:'blocks',name:'雪花方块',symbol:'▦',hint:'← → 移动 · ↑ 旋转 · ↓ 加速 · 空格落下',detail:'填满一行就能消除。'},
  {id:'snake',name:'春芽贪吃蛇',symbol:'⌁',hint:'方向键转向',detail:'吃春芽，别咬到自己。'},
  {id:'bricks',name:'无尽潮汐',symbol:'▤',hint:'点击后移动鼠标 · 触屏拖动 · 空格发球',detail:'守住不断下移的砖块。'},
  {id:'merge',name:'秋色 2048',symbol:'◇',hint:'方向键或滑动',detail:'合并相同数字。'},
  {id:'pairs',name:'四季翻翻乐',symbol:'✿',hint:'翻错扣一格血 · 配完进入下一面',detail:'记住卡片，挑战更高分。'},
  {id:'falling',name:'四季叠叠球',symbol:'◉',hint:'拖动选位置，松手投球',detail:'相同的小球会合成。'},
];
export const arcadeScoreKey=id=>`arcade.${id}${id==='bricks'?'.v4':id==='pairs'?'.v3':['blocks','snake'].includes(id)?'.v2':''}`;
// Optimal-memory Monte Carlo: 25 mistakes permit about five completed 8-pair boards.
export const pairsHealth=25;
export const blockInterval=(time,lines,pieces)=>.15+.37*Math.exp(-Math.max(time/45,lines/3,pieces/8)*.16);
export const mergeDuration=.12;
const shapes=[[[1,1,1,1]],[[2,2],[2,2]],[[0,3,0],[3,3,3]],[[0,4,4],[4,4,0]],[[5,5,0],[0,5,5]],[[6,0,0],[6,6,6]],[[0,0,7],[7,7,7]]];
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function mergeLine(line){
  const cells=line.filter(Boolean),out=[];let score=0;
  for(let i=0;i<cells.length;i++){if(cells[i]===cells[i+1]){out.push(cells[i]*2);score+=cells[i]*2;i++;}else out.push(cells[i]);}
  return {line:[...out,...Array(line.length-out.length).fill(0)],score};
}
/** Renderer-independent small games. Each instance owns its clock and random source. */
export class Arcade{
  constructor(kind,random=Math.random){
    this.kind=kind;this.random=random;this.score=0;this.over=false;this.won=false;this.time=0;this.tick=0;
    this.falling=kind==='falling'?new FallingMerge(random):null;
    /** @type {number[][]} */ this.board=[];
    /** @type {number[]} */ this.bag=[];
    /** @type {number[][]} */ this.shape=[];
    /** @type {number[][]} */ this.next=[];
    this.px=3;this.py=0;this.lines=0;this.pieces=0;
    this.snake=[{x:7,y:8},{x:6,y:8},{x:5,y:8}];this.dir={x:1,y:0};this.queued={x:1,y:0};this.food={x:11,y:8};
    /** @type {{x:number;y:number}[]} */ this.turns=[];
    this.paddle=.5;this.ball={x:.5,y:.83,vx:.3,vy:-.52};this.serving=true;this.lives=3;this.axis=0;
    /** @type {{x:number;y:number;tone:number;row:number;age:number}[]} */ this.bricks=[];
    this.activeTime=0;this.hits=0;this.rowTravel=0;this.rows=4;this.clearedRows=0;this.rowSpeed=.0048;
    for(let row=0;row<4;row++)for(let col=0;col<8;col++)this.bricks.push({x:col*.116+.037,y:.1+row*.048,tone:row%6+1,row,age:1});
    /** @type {{fromX:number;fromY:number;x:number;y:number;value:number}[]} */ this.tiles=[];
    /** @type {{x:number;y:number}[]} */ this.merges=[];
    /** @type {{x:number;y:number}|null} */ this.newTile=null;
    this.mergeAge=mergeDuration;
    /** @type {string[]} */ this.mergeQueue=[];
    /** @type {number[]} */ this.cards=shuffle([...Array(8).keys(),...Array(8).keys()],random);
    /** @type {number[]} */ this.open=[];
    /** @type {number[]} */ this.matched=[];
    this.reveal=0;this.moves=0;this.flips=0;this.health=pairsHealth;this.boards=0;this.boardDelay=0;
    if(kind==='blocks'){this.board=Array.from({length:20},()=>Array(10).fill(0));this.next=this.drawPiece();this.spawn();}
    if(kind==='merge'){this.board=Array.from({length:4},()=>Array(4).fill(0));this.addTile();this.addTile();}
  }
  drawPiece(){if(!this.bag.length)this.bag=shuffle([...Array(7).keys()],this.random);return shapes[this.bag.pop()].map(r=>r.slice());}
  fits(shape=this.shape,x=this.px,y=this.py){return shape.every((row,j)=>row.every((v,i)=>!v||x+i>=0&&x+i<10&&y+j<20&&(y+j<0||!this.board[y+j][x+i])));}
  spawn(){this.shape=this.next;this.next=this.drawPiece();this.px=Math.floor((10-this.shape[0].length)/2);this.py=0;if(!this.fits())this.over=true;}
  lock(){
    this.pieces++;
    this.shape.forEach((row,j)=>row.forEach((v,i)=>{if(v&&this.py+j>=0)this.board[this.py+j][this.px+i]=v;}));
    const rows=this.board.filter(row=>row.some(v=>!v)),count=20-rows.length;this.lines+=count;this.score+=[0,100,300,500,800][count]*(1+Math.floor(this.lines/10));
    this.board=[...Array.from({length:count},()=>Array(10).fill(0)),...rows];this.spawn();
  }
  drop(){if(this.fits(this.shape,this.px,this.py+1)){this.py++;return true;}this.lock();this.tick=0;return false;}
  addTile(){
    const empty=[];this.board.forEach((r,y)=>r.forEach((v,x)=>{if(!v)empty.push({x,y});}));
    if(empty.length){const p=empty[Math.floor(this.random()*empty.length)];this.board[p.y][p.x]=this.random()<.9?2:4;this.newTile=p;}
  }
  get ballSpeed(){return .60+.72*(1-Math.exp(-this.activeTime/220));}
  get descentTarget(){return .0048+.0054*(1-Math.exp(-this.clearedRows/24));}
  get rowInterval(){return .048/this.rowSpeed;}
  addBrickRow(){
    if(this.bricks.some(b=>b.y<.148-.000001))return false;
    const gap=Math.floor(this.random()*8);
    for(let col=0;col<8;col++)if(col!==gap)this.bricks.push({x:col*.116+.037,y:.1,tone:this.rows%6+1,row:this.rows,age:0});
    this.rows++;return true;
  }
  hitBrick(index){
    const [brick]=this.bricks.splice(index,1);this.hits++;this.score+=25;
    if(!this.bricks.some(b=>b.row===brick.row))this.clearedRows++;
  }
  action(key){
    if(this.over)return;
    if(this.falling){
      if(key==='left')this.falling.aim=clamp(this.falling.aim-.05,.1,.9);
      if(key==='right')this.falling.aim=clamp(this.falling.aim+.05,.1,.9);
      if(key==='space')this.falling.drop();
    }else if(this.kind==='blocks'){
      if(key==='left'&&this.fits(this.shape,this.px-1))this.px--;
      if(key==='right'&&this.fits(this.shape,this.px+1))this.px++;
      if(key==='up'){const rotated=this.shape[0].map((_,i)=>this.shape.map(r=>r[i]).reverse());for(const shift of [0,-1,1,-2,2])if(this.fits(rotated,this.px+shift)){this.shape=rotated;this.px+=shift;break;}}
      if(key==='down'&&this.drop())this.score++;
      if(key==='space'){while(this.fits(this.shape,this.px,this.py+1)){this.py++;this.score+=2;}this.lock();this.tick=0;}
    }else if(this.kind==='snake'){
      const d={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}}[key];
      const previous=this.turns.at(-1)??this.dir;
      if(d&&this.turns.length<2&&(d.x!==-previous.x||d.y!==-previous.y)&&(d.x!==previous.x||d.y!==previous.y)){this.turns.push(d);this.queued=d;}
    }else if(this.kind==='merge'&&['left','right','up','down'].includes(key)){
      if(this.mergeAge<mergeDuration){if(this.mergeQueue.length<2)this.mergeQueue.push(key);return;}
      const old=JSON.stringify(this.board),vertical=key==='up'||key==='down',reverse=key==='right'||key==='down';
      this.tiles=[];this.merges=[];
      for(let i=0;i<4;i++){
        const point=j=>vertical?{x:i,y:reverse?3-j:j}:{x:reverse?3-j:j,y:i};
        const cells=Array.from({length:4},(_,j)=>{const p=point(j);return {...p,value:this.board[p.y][p.x]};}).filter(c=>c.value);
        const line=Array(4).fill(0);let target=0;
        for(let j=0;j<cells.length;j++,target++){
          const c=cells[j],p=point(target);line[target]=c.value;
          this.tiles.push({fromX:c.x,fromY:c.y,...p,value:c.value});
          if(c.value===cells[j+1]?.value){const next=cells[++j];line[target]*=2;this.score+=line[target];this.tiles.push({fromX:next.x,fromY:next.y,...p,value:next.value});this.merges.push(p);}
        }
        for(let j=0;j<4;j++){const p=point(j);this.board[p.y][p.x]=line[j];}
      }
      if(JSON.stringify(this.board)!==old){this.moves++;this.addTile();this.mergeAge=0;}
      if(this.board.flat().some(v=>v>=2048))this.won=true;
      if(this.board.every((r,y)=>r.every((v,x)=>v&&v!==r[x+1]&&v!==this.board[y+1]?.[x])))this.over=true;
    }else if(this.kind==='bricks'){
      if(key==='space')this.serving=false;
      if(key==='left')this.paddle=clamp(this.paddle-.045,.1,.9);
      if(key==='right')this.paddle=clamp(this.paddle+.045,.1,.9);
    }
  }
  flip(i){
    if(this.kind!=='pairs'||this.over||this.reveal||this.boardDelay||i<0||i>=16||this.open.includes(i)||this.matched.includes(i))return;
    this.flips++;
    this.open.push(i);
    if(this.open.length===2){
      this.moves++;
      if(this.cards[this.open[0]]===this.cards[this.open[1]]){this.matched.push(...this.open);this.open=[];this.score+=100;if(this.matched.length===16){this.score+=200;this.boards++;this.boardDelay=.65;}}
      else{this.health--;this.reveal=.8;if(!this.health)this.over=true;}
    }
  }
  update(dt){
    dt=clamp(dt,0,.1);
    if(this.kind==='merge'){this.mergeAge=Math.min(mergeDuration,this.mergeAge+dt);if(!this.over&&this.mergeAge>=mergeDuration&&this.mergeQueue.length)this.action(this.mergeQueue.shift());}
    if(this.over)return;this.time+=dt;this.tick+=dt;
    if(this.falling){this.falling.aim=clamp(this.falling.aim+this.axis*dt*.7,.1,.9);this.falling.update(dt);this.score=this.falling.score;this.over=this.falling.over;return;}
    if(this.kind==='blocks'&&this.tick>=blockInterval(this.time,this.lines,this.pieces)){this.tick=0;this.drop();}
    if(this.kind==='snake'&&this.tick>=Math.max(.065,.17-this.score*.00012)){
      this.tick=0;this.dir=this.turns.shift()??this.dir;const head={x:(this.snake[0].x+this.dir.x+16)%16,y:(this.snake[0].y+this.dir.y+16)%16},eat=head.x===this.food.x&&head.y===this.food.y;
      const body=eat?this.snake:this.snake.slice(0,-1);
      if(body.some(p=>p.x===head.x&&p.y===head.y)){this.over=true;return;}
      this.snake.unshift(head);if(!eat)this.snake.pop();
      else{this.score+=10;const empty=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(!this.snake.some(p=>p.x===x&&p.y===y))empty.push({x,y});if(!empty.length)this.won=this.over=true;else this.food=empty[Math.floor(this.random()*empty.length)];}
    }
    if(this.kind==='pairs'&&this.reveal){this.reveal=Math.max(0,this.reveal-dt);if(!this.reveal)this.open=[];}
    if(this.kind==='pairs'&&this.boardDelay){this.boardDelay=Math.max(0,this.boardDelay-dt);if(!this.boardDelay){this.cards=shuffle([...Array(8).keys(),...Array(8).keys()],this.random);this.matched=[];this.open=[];}}
    if(this.kind==='bricks'){
      this.paddle=clamp(this.paddle+this.axis*dt*.9,.1,.9);
      if(this.serving){this.ball.x=this.paddle;this.ball.y=.84;return;}
      this.activeTime+=dt;
      this.rowSpeed+=(this.descentTarget-this.rowSpeed)*(1-Math.exp(-dt/4));
      const descend=this.rowSpeed*dt;this.rowTravel+=descend;this.bricks.forEach(b=>{b.y+=descend;b.age+=dt;});
      this.addBrickRow();
      if(this.bricks.some(b=>b.y+.036>=.80)){this.over=true;return;}
      const n=Math.ceil(dt*240),h=dt/n,b=this.ball;
      const speed=this.ballSpeed,length=Math.hypot(b.vx,b.vy)||1;b.vx*=speed/length;b.vy*=speed/length;
      for(let step=0;step<n;step++){
        const oldX=b.x,oldY=b.y;b.x+=b.vx*h;b.y+=b.vy*h;
        if(b.x<.015){b.x=.015;b.vx=Math.abs(b.vx);}if(b.x>.985){b.x=.985;b.vx=-Math.abs(b.vx);}if(b.y<.02){b.y=.02;b.vy=Math.abs(b.vy);}
        if(b.vy>0&&oldY<.865&&b.y>=.865&&Math.abs(b.x-this.paddle)<.115){const offset=clamp((b.x-this.paddle)/.115,-1,1);b.vx=offset*speed*.85;b.vy=-Math.sqrt(speed**2-b.vx**2);b.y=.864;}
        for(let i=0;i<this.bricks.length;i++){
          const {x,y}=this.bricks[i];
          if(b.x>x-.015&&b.x<x+.11+.015&&b.y>y-.015&&b.y<y+.036+.015){
            this.hitBrick(i);if(oldX<=x-.015||oldX>=x+.125)b.vx*=-1;else b.vy*=-1;break;
          }
        }
        if(b.y>1.03){this.lives--;if(!this.lives)this.over=true;else{this.serving=true;this.ball={x:this.paddle,y:.84,vx:.3,vy:-.52};}break;}
      }
    }
  }
}
