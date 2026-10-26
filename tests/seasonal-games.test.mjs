import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeCourse,createRace,advanceRace,raceGrade,resetRaceVehicle,createVehicle,advanceVehicle,seaClear,readBest,saveBest,formatTime} from '../shared/seasonal-games.mjs';
import {Arcade,mergeLine,blockInterval,mergeDuration,arcadeScoreKey,pairsHealth} from '../shared/arcade.mjs';
import {seaPath,waterClear,waterContact} from '../shared/game-routes.mjs';
import {guidanceWindow,gateVisibility,fadeGate} from '../shared/race-guidance.mjs';
import {flightFloor} from '../shared/flight-contact.mjs';
import {distantIslands} from '../shared/distant-islands.mjs';
import {supportedFootprint} from '../shared/navigation.mjs';
import {FallingMerge,orbRadii} from '../shared/falling-merge.mjs';
import {bikeBody,bikeContact,bikeMotion,bikeObstruction} from '../shared/bike-contact.mjs';
import {seededRandom} from '../shared/living-catalog.mjs';
const regions=JSON.parse(readFileSync(new URL('../data/world.json',import.meta.url))).regions;
const crossing=g=>[{x:g.x-g.nx*8,y:g.y,z:g.z-g.nz*8},{x:g.x+g.nx*8,y:g.y,z:g.z+g.nz*8}];
test('three courses require ordered forward crossings, two laps, and ignore later or reverse gates',()=>{
  for(const id of ['spring','summer','autumn']){
    const course=makeCourse(id,regions),race=createRace(course);race.countdown=0;
    assert.ok(course.gates.length>=6);assert.ok(course.path.every(p=>Object.values(p).every(Number.isFinite)));
    const future=course.gates[3];advanceRace(race,...crossing(future),.1);assert.equal(race.passed,0);
    advanceRace(race,...crossing(course.gates[1]).reverse(),.1);assert.equal(race.passed,0);
    for(let i=0;i<course.gates.length*2;i++){assert.equal(race.finished,false);assert.equal(advanceRace(race,...crossing(course.gates[race.next]),.1),true);}
    assert.equal(race.finished,true);assert.equal(race.passed,course.gates.length*2);assert.equal(race.lap,2);
    const elapsed=race.elapsed;advanceRace(race,...crossing(course.gates[0]),1);assert.equal(race.elapsed,elapsed);
  }
});
test('countdown, free roam, reset penalty, vertical misses and medal boundaries are distinct',()=>{
  const course=makeCourse('autumn',regions),race=createRace(course);
  advanceRace(race,...crossing(course.gates[1]),1);assert.equal(race.elapsed,0);assert.equal(race.countdown,2);
  race.countdown=0;advanceRace(race,...crossing(course.gates[1]).map(p=>({...p,y:100})),1);assert.equal(race.passed,0);
  resetRaceVehicle(race);assert.equal(race.penalty,5);race.elapsed=course.medals[0]-5;assert.equal(raceGrade(race),'gold');
  race.elapsed+=.01;assert.equal(raceGrade(race),'silver');race.elapsed=course.medals[1];assert.equal(raceGrade(race),'bronze');
  const free=createRace(course,true);free.countdown=0;advanceRace(free,...crossing(course.gates[1]),1);resetRaceVehicle(free);assert.equal(free.passed,0);assert.equal(free.penalty,0);assert.equal(free.elapsed,1);
});
test('boat course avoids shores; steering and braking work at low frame rates without tunneling',()=>{
  const course=makeCourse('summer',regions);assert.ok(course.path.every((p,i)=>{const q=course.path[(i+1)%course.path.length];return seaClear(p.x,p.z,regions,Math.atan2(q.x-p.x,q.z-p.z));}));
  const s=createVehicle('summer',{x:51,y:-5.65,z:24,yaw:-Math.PI/2});
  for(let i=0;i<100;i++)advanceVehicle(s,{throttle:1,boost:true},.1,regions,[],i*.1);
  assert.ok(seaClear(s.x,s.z,regions,s.yaw));assert.ok(s.x>45);
  const state=createVehicle('summer',course.spawn);
  for(let i=0;i<120;i++)advanceVehicle(state,{throttle:1,turn:.2},1/60,regions,[]);
  const speed=state.speed;assert.ok(speed>5);assert.ok(Math.abs(state.yaw-course.spawn.yaw)>.2);
  for(let i=0;i<120;i++)advanceVehicle(state,{brake:true},1/60,regions,[]);
  assert.ok(Math.abs(state.speed)<speed*.1);
});
test('motorcycle crosses small curbs and stays on the shared island/bridge surface',()=>{
  const world=[{position:[30,0],radius:30}],s=createVehicle('spring',{x:30,y:0,z:0,yaw:0});
  const curb={x:30,z:3,halfX:3,halfZ:.2,radius:0,height:.4};
  for(let i=0;i<240;i++)advanceVehicle(s,{throttle:1},1/120,world,[curb]);
  assert.ok(s.z>8);assert.equal(s.y,0);assert.equal(s.grounded,true);
  for(let i=0;i<100;i++)advanceVehicle(s,{throttle:1,boost:true},.1,world,[]);
  assert.ok(s.z<29);
});
test('vehicle integration is stable across frame rates; glider gains altitude in thermals',()=>{
  const run=dt=>{const s=createVehicle('summer',{x:72,y:-5.65,z:18,yaw:0});for(let i=0;i<2/dt;i++)advanceVehicle(s,{throttle:1,turn:.25},dt,regions,[],i*dt);return s;};
  const slow=run(.1),fast=run(1/120);assert.ok(Math.hypot(slow.x-fast.x,slow.z-fast.z)<.01);assert.ok(Math.abs(slow.speed-fast.speed)<.001);
  const s=createVehicle('autumn',{x:-45,y:25,z:28,yaw:0}),before=s.y;
  advanceVehicle(s,{throttle:0,turn:.5},.1,regions,[]);assert.ok(s.y>before);assert.ok(s.bank<0);assert.equal(s.hit,false);
});
test('best records persist, favor appropriate score direction and tolerate storage failures',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  assert.equal(readBest(storage,'race'),null);saveBest(storage,'race',90,true);saveBest(storage,'race',100,true);assert.equal(readBest(storage,'race'),90);
  assert.equal(saveBest(storage,'race',80,true).record,true);saveBest(storage,'arcade',800);saveBest(storage,'arcade',400);assert.equal(readBest(storage,'arcade'),800);
  values.set('xiangmeta.games.v1.bad','{"broken":1}');assert.equal(readBest(storage,'bad'),null);
  assert.equal(saveBest({getItem:()=>null,setItem:()=>{throw Error();}},'x',3).saved,false);
  assert.equal(saveBest(storage,'race',NaN,true).saved,false);
});
test('2048 merges each tile once, ignores no-op moves and detects wins/losses',()=>{
  assert.deepEqual(mergeLine([2,2,2,2]),{line:[4,4,0,0],score:8});
  assert.deepEqual(mergeLine([2,2,4,0]),{line:[4,4,0,0],score:4});
  const g=new Arcade('merge',seededRandom(5));g.board=[[1024,1024,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];g.action('left');assert.equal(g.won,true);assert.equal(g.score,2048);
  const loss=new Arcade('merge');loss.board=[[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]];loss.action('left');assert.equal(loss.over,true);assert.equal(loss.moves,0);
});
test('blocks clear complete rows, rotate with wall kicks and end when spawn is occupied',()=>{
  const g=new Arcade('blocks',seededRandom(5));g.board[19]=[1,1,1,1,1,1,0,0,0,0];g.shape=[[1,1,1,1]];g.px=6;g.py=0;g.action('space');
  assert.equal(g.lines,1);assert.ok(g.score>=100);assert.equal(g.board[19].filter(Boolean).length,0);
  g.shape=[[1],[1],[1],[1]];g.px=9;g.py=3;g.action('up');assert.ok(g.fits());
  g.board[0].fill(1);g.spawn();assert.equal(g.over,true);
});
test('snake wraps at every edge, rejects reversal and still collides with itself; pairs lock mismatches',()=>{
  const snake=new Arcade('snake',seededRandom(3));snake.action('left');snake.update(.1);snake.update(.1);assert.equal(snake.snake[0].x,8);
  snake.food={x:9,y:8};snake.update(.1);snake.update(.1);assert.equal(snake.score,10);assert.equal(snake.snake.length,4);
  for(let i=0;i<30;i++)snake.update(.1);assert.equal(snake.over,false);
  for(const [head,dir,expected] of [[{x:15,y:5},{x:1,y:0},{x:0,y:5}],[{x:0,y:5},{x:-1,y:0},{x:15,y:5}],[{x:5,y:15},{x:0,y:1},{x:5,y:0}],[{x:5,y:0},{x:0,y:-1},{x:5,y:15}]]){
    const s=new Arcade('snake');s.snake=[head];s.dir=dir;s.update(.1);s.update(.1);assert.deepEqual(s.snake[0],expected);
  }
  const self=new Arcade('snake');self.snake=[{x:5,y:5},{x:6,y:5},{x:6,y:6},{x:5,y:6}];self.update(.1);self.update(.1);assert.equal(self.over,true);
  const pairs=new Arcade('pairs',seededRandom(9));let a=0,b=pairs.cards.findIndex(v=>v!==pairs.cards[0]);pairs.flip(a);pairs.flip(b);pairs.flip(3);assert.equal(pairs.open.length,2);
  for(let i=0;i<9;i++)pairs.update(.1);assert.equal(pairs.open.length,0);
  for(let value=0;value<8;value++){pairs.cards.forEach((v,i)=>{if(v===value)pairs.flip(i);});}
  assert.equal(pairs.over,false);assert.equal(pairs.boards,1);assert.equal(pairs.matched.length,16);assert.equal(pairs.score,1000);
});
test('endless breakout speeds up, replenishes descending rows and ends only on missed balls or red-line contact',()=>{
  const g=new Arcade('bricks');g.serving=false;g.ball={x:.5,y:.85,vx:0,vy:.6};g.update(.05);assert.ok(g.ball.vy<0);
  const count=g.bricks.length;g.ball={x:.08,y:.08,vx:0,vy:.6};g.update(.06);assert.equal(g.bricks.length,count-1);assert.equal(g.score,25);
  g.ball={x:.9,y:1.02,vx:0,vy:.6};g.update(.1);assert.equal(g.lives,2);assert.equal(g.serving,true);
  g.bricks=[];g.serving=false;g.update(.01);assert.equal(g.over,false);assert.equal(g.bricks.length,7);
  const speed=g.ballSpeed;g.activeTime+=120;g.update(.1);assert.ok(g.ballSpeed>speed);assert.ok(g.bricks[0].y>.1);
  g.bricks[0].y=.77;g.update(.01);assert.equal(g.over,true);
});
test('Tetris gains pace early with a bounded smooth curve instead of sudden level jumps',()=>{
  assert.equal(blockInterval(0,0,0),.52);assert.ok(blockInterval(45,0,0)<.47);
  let previous=.52;for(let t=1;t<=1200;t++){const next=blockInterval(t,t/5,t/2);assert.ok(next<=previous&&previous-next<.005);previous=next;}
  assert.ok(previous>=.15);assert.ok(blockInterval(0,12,40)<.34);
});
test('2048 continues after the milestone, tracks tile motion and drains fast buffered input',()=>{
  const g=new Arcade('merge',seededRandom(3));g.board=[[1024,1024,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  g.action('left');assert.equal(g.over,false);assert.equal(g.won,true);assert.equal(g.mergeAge,0);
  assert.equal(g.tiles.length,2);assert.equal(g.merges.length,1);assert.ok(g.newTile);g.action('down');g.action('right');
  for(let i=0;i<6;i++)g.update(.1);assert.equal(g.mergeAge,mergeDuration);assert.equal(g.mergeQueue.length,0);assert.ok(g.moves>=2);
});
test('pairs lose health only on mismatches, retain earned points and continue on freshly shuffled boards',()=>{
  const finish=extra=>{
    const g=new Arcade('pairs',seededRandom(9));const different=g.cards.findIndex(v=>v!==g.cards[0]);
    for(let i=0;i<extra;i++){g.flip(0);g.flip(different);for(let j=0;j<9;j++)g.update(.1);}
    for(let n=0;n<8;n++)g.cards.forEach((v,i)=>{if(v===n)g.flip(i);});return g;
  };
  const a=finish(0),b=finish(4);assert.equal(a.score,b.score);assert.equal(a.health-b.health,4);
  const cards=a.cards.slice();for(let i=0;i<7;i++)a.update(.1);
  assert.equal(a.matched.length,0);assert.notDeepEqual(a.cards,cards);assert.equal(a.score,1000);assert.equal(a.health,pairsHealth);
  for(let n=0;n<8;n++)a.cards.forEach((v,i)=>{if(v===n)a.flip(i);});assert.equal(a.boards,2);assert.equal(a.score,2000);
  const g=new Arcade('pairs');g.flip(0);g.flip(0);assert.equal(g.score,0);assert.equal(g.health,pairsHealth);
  const wrong=g.cards.findIndex(v=>v!==g.cards[0]);g.health=1;g.flip(wrong);assert.equal(g.health,0);assert.equal(g.over,true);
  assert.equal(arcadeScoreKey('pairs'),'arcade.pairs.v4');assert.equal(arcadeScoreKey('bricks'),'arcade.bricks.v4');
});
test('large sea course has safe bridge crossings and rejects stone piers',()=>{
  const path=seaPath();assert.ok(path.length>1000);assert.ok(waterClear(-10.7,-13.4,regions,Math.atan2(7.04,-5.64)));
  assert.equal(waterClear(-8.7,-10.8,regions,0),false);
});
test('drift turns the motorcycle more sharply, retains a short slide and recovers grip on release',()=>{
  const world=[{position:[70,30],radius:100}],normal=createVehicle('spring',{x:70,y:0,z:30,yaw:0}),drift={...normal};
  normal.speed=drift.speed=8;normal.vz=drift.vz=8;
  for(let i=0;i<24;i++){advanceVehicle(normal,{turn:1,throttle:1},1/120,world,[]);advanceVehicle(drift,{turn:1,throttle:1,drift:true},1/120,world,[]);}
  assert.ok(drift.yaw>normal.yaw*1.6);assert.ok(drift.drift>.8);
  assert.ok(Math.abs(Math.atan2(drift.vx,drift.vz)-drift.yaw)>.1);
  for(let i=0;i<90;i++)advanceVehicle(drift,{throttle:1},1/120,world,[]);
  assert.ok(drift.drift<.001);assert.ok(Math.abs(Math.atan2(drift.vx,drift.vz)-drift.yaw)<.01);
});
test('time rounding carries into the next minute and flight gates match their circular opening',()=>{
  assert.equal(formatTime(59.999),'01:00.00');assert.equal(formatTime(119.999),'02:00.00');assert.equal(formatTime(Infinity),'—');
  const course=makeCourse('autumn',regions),race=createRace(course),g=course.gates[1];race.countdown=0;
  const miss=crossing(g).map(p=>({...p,x:p.x+g.nz*g.radius*.95,z:p.z-g.nx*g.radius*.95,y:p.y+g.radius*.95}));
  assert.equal(advanceRace(race,...miss,.1),false);assert.equal(race.passed,0);
});
test('releasing boost preserves momentum, depletion waits for release, and the full motorcycle body stops at walls',()=>{
  for(const kind of ['spring','summer']){
    const s=createVehicle(kind,{x:70,y:kind==='spring'?0:-5.65,z:30,yaw:0}),world=kind==='spring'?[{position:[70,30],radius:100}]:regions;
    s.speed=kind==='spring'?16:25;s.vx=0;s.vz=s.speed;
    advanceVehicle(s,{},1/120,world,[]);assert.ok(s.speed>(kind==='spring'?15.8:24.8),'no sudden clamp on boost release');
    s.boost=.001;advanceVehicle(s,{boost:true,throttle:1},.1,world,[]);assert.equal(s.boostReady,false);
    for(let i=0;i<25;i++)advanceVehicle(s,{boost:true,throttle:1},.1,world,[]);
    assert.equal(s.boostReady,false);advanceVehicle(s,{},1/120,world,[]);assert.equal(s.boostReady,true);
  }
  const s=createVehicle('spring',{x:30,y:0,z:0,yaw:0}),world=[{position:[30,0],radius:30}],wall={x:30,z:3,halfX:3,halfZ:.1,radius:0,height:4};
  for(let i=0;i<240;i++)advanceVehicle(s,{throttle:1},1/120,world,[wall]);
  assert.ok(s.z+bikeBody.length+bikeBody.radius<=2.90001,'front wheel stays outside the wall');
  for(let i=0;i<240;i++)advanceVehicle(s,{throttle:-1},1/120,world,[wall]);
  assert.ok(s.z<-.5,'backing away is always available');
});
test('motorcycles slide past boxes, round props and railings without penetrating or losing tangent motion',()=>{
  const world=[{position:[70,30],radius:100}];
  for(const obstacle of [
    {x:70,z:34,halfX:5,halfZ:.1,radius:0,height:3},
    {x:70,z:34,radius:2,height:3},
    {x:70,z:34,radius:.1,height:3,segment:[65,34,75,34]},
  ]){
    const s=createVehicle('spring',{x:70,y:0,z:30,yaw:.4});let first=null;
    for(let i=0;i<360;i++){
      advanceVehicle(s,{throttle:1},1/120,world,[obstacle]);
      if(s.hit)first??={x:s.x,z:s.z};
      assert.ok(bikeContact(s.x,s.z,s.y,s.yaw,[obstacle]).depth<.00001);
    }
    assert.ok(first,'the test reaches the obstacle');
    assert.ok(s.x-first.x>4&&s.z>37,'glancing contact continues around the obstacle');
    assert.ok(s.speed>5,'contact preserves useful momentum');
  }
});
test('motorcycles can reverse out of an existing wall or moving-animal overlap',()=>{
  const world=[{position:[70,30],radius:100}];
  for(const obstacle of [
    {x:70,z:30.8,halfX:1,halfZ:.1,radius:0,height:3},
    {x:70,z:30.8,radius:.55,height:1.8,base:0,dynamic:true},
  ]){
    const s=createVehicle('spring',{x:70,y:0,z:30,yaw:0});
    assert.ok(bikeContact(s.x,s.z,s.y,s.yaw,[obstacle]).depth>.2);
    for(let i=0;i<150;i++)advanceVehicle(s,{throttle:-1},1/120,world,[obstacle]);
    assert.ok(s.z<28);assert.equal(bikeContact(s.x,s.z,s.y,s.yaw,[obstacle]).depth,0);
    assert.equal(s.y,0,'contact does not push the rider onto the model');
  }
});
test('escaping an animal beside a wall preserves movement without borrowing clearance through the wall',()=>{
  const world=[{position:[70,30],radius:100}],s=createVehicle('spring',{x:70,y:0,z:30,yaw:0});
  const wall={x:69.5,z:30,halfX:.1,halfZ:3,radius:0,height:3},animal={x:70.35,z:30,radius:.6,height:1.8,dynamic:true};
  s.vx=-1;s.vz=1;
  const before=bikeContact(s.x,s.z,s.y,s.yaw,[animal]).depth;
  assert.ok(before>.5);assert.equal(bikeContact(s.x,s.z,s.y,s.yaw,[wall]).depth,0);
  assert.ok(bikeObstruction(s,s.x,s.z,-.15,[wall,animal]).depth>0,'turning does not put the front wheel through the wall');
  const motion=bikeMotion(s,-.08,.06,world,[wall,animal]);s.x+=motion.x;s.z+=motion.z;
  assert.ok(motion.z>.05,'the rider can still slide along the wall');
  assert.equal(bikeContact(s.x,s.z,s.y,s.yaw,[wall]).depth,0);
  assert.ok(bikeContact(s.x,s.z,s.y,s.yaw,[animal]).depth<before);
  assert.equal(s.vx,0,'only inward velocity is removed');
});
test('snake buffers two quick corners and rejects a reversal against the queued turn',()=>{
  const g=new Arcade('snake');g.action('up');g.action('left');g.action('down');
  for(let i=0;i<2;i++)g.update(.1);assert.deepEqual(g.snake[0],{x:7,y:7});
  for(let i=0;i<2;i++)g.update(.1);assert.deepEqual(g.snake[0],{x:6,y:7});assert.equal(g.over,false);
});
test('reset preserves elapsed time, pauses it for three seconds, and adds a separate penalty',()=>{
  const course=makeCourse('summer',regions),race=createRace(course);race.countdown=0;race.elapsed=42;
  const next=race.next,lap=race.lap;resetRaceVehicle(race);assert.equal(race.countdown,3);assert.equal(race.penalty,5);
  for(let i=0;i<3;i++)advanceRace(race,...crossing(course.gates[next]),1);
  assert.equal(race.elapsed,42);assert.equal(race.next,next);assert.equal(race.lap,lap);
  advanceRace(race,...crossing(course.gates[next]),.5);assert.equal(race.elapsed,42.5);
});
test('flight rings allow a slight graze and the glider has a slower default and dive cap',()=>{
  const course=makeCourse('autumn',regions),g=course.gates[1],race=createRace(course);race.countdown=0;
  const graze=crossing(g).map(p=>({...p,x:p.x+g.nz*(g.radius+.8),z:p.z-g.nx*(g.radius+.8)}));
  assert.equal(advanceRace(race,...graze,.1),true);
  const miss=createRace(course);miss.countdown=0;
  assert.equal(advanceRace(miss,...graze.map(p=>({...p,y:g.y+4})),.1),false);
  const s=createVehicle('autumn',course.spawn);assert.equal(s.speed,11);
  for(let i=0;i<120;i++)advanceVehicle(s,{throttle:1},.1,regions,[]);
  assert.ok(s.speed<=19);
});
test('guidance shows imminent gates and selects the current branch at a coincident crossing',()=>{
  const gateIndices=[0,2,5,7],path=[
    {x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0},{x:2,y:0,z:1},{x:1,y:0,z:1},{x:0,y:0,z:1},{x:1,y:0,z:0},{x:2,y:0,z:-1},{x:0,y:0,z:0},
  ];
  const race={next:1,course:{path,gateIndices}},window=guidanceWindow(race,{x:1,y:0,z:0});
  assert.ok(window.some(p=>p.z===1));assert.ok(!window.some(p=>p.z===-1));
  assert.deepEqual(Array.from({length:6},(_,i)=>gateVisibility(5,i,6)),[.60,.28,0,0,0,1]);
});
test('boats slide along shore contact and reverse promptly without growing a trapped collision box',()=>{
  for(const yaw of [-Math.PI/2,-Math.PI/2+.3]){
    const s=createVehicle('summer',{x:51,y:-5.65,z:24,yaw});
    for(let i=0;i<130;i++)advanceVehicle(s,{throttle:1},1/30,regions,[]);
    assert.ok(waterContact(s.x,s.z,regions,s.yaw).depth<.001);
    const start={x:s.x,z:s.z};
    for(let i=0;i<60;i++)advanceVehicle(s,{throttle:-1,turn:.15},1/30,regions,[]);
    assert.ok(Math.hypot(s.x-start.x,s.z-start.z)>1);
    assert.ok(waterContact(s.x,s.z,regions,s.yaw).depth<.001);
  }
});
test('clearing a brick row preserves every remaining position and existing descent progress',()=>{
  const g=new Arcade('bricks'),rows=g.rows;g.rowTravel=.032;
  const before=g.bricks.filter(b=>b.row!==0).map(b=>({...b})),speed=g.ballSpeed,descent=g.rowSpeed;
  for(let i=0;i<7;i++)g.hitBrick(g.bricks.findIndex(b=>b.row===0));
  assert.equal(g.rows,rows);g.hitBrick(g.bricks.findIndex(b=>b.row===0));
  assert.equal(g.rows,rows);assert.equal(g.rowTravel,.032);assert.deepEqual(g.bricks,before);
  assert.equal(g.clearedRows,1);assert.equal(g.ballSpeed,speed);assert.equal(g.rowSpeed,descent);
  g.addBrickRow();assert.equal(g.rows,rows+1);assert.equal(g.bricks.filter(b=>b.row===rows).length,7);
  assert.deepEqual(g.bricks.filter(b=>b.row!==rows),before);assert.equal(g.addBrickRow(),false);
});
test('falling balls merge in chains, respect drop cooldown and settle without tunneling',()=>{
  const g=new FallingMerge(()=>0);assert.equal(g.drop(),true);assert.equal(g.drop(),false);
  for(let i=0;i<60;i++)g.update(1/120);
  for(let i=0;i<17;i++){g.drop();for(let t=0;t<60;t++)g.update(1/120);}
  for(let i=0;i<240;i++)g.update(1/120);
  assert.equal(g.over,false);assert.ok(g.highest>=4);assert.ok(g.balls.length<5);assert.ok(g.score>0);
  for(const b of g.balls){assert.ok(b.x-b.r>=.07&&b.x+b.r<=.93);assert.ok(b.y+b.r<=.940001);}
  const before=JSON.stringify(g);g.update(0);assert.equal(JSON.stringify(g),before);
});
test('falling balls reach the floor promptly and show a short, settling impact bounce',()=>{
  for(const dt of [1/120,1/30,.1]){
    const g=new FallingMerge(()=>0);g.drop();let time=0;
    while(time<1&&!g.effects.some(e=>e.kind==='hit')){g.update(dt);time+=dt;}
    assert.ok(time<.7,'a fresh ball falls in under 700 ms');
    const ball=g.balls[0];assert.ok(ball.vy<-.3,'floor impact produces a visible rebound');
    assert.ok(ball.pulse>.04,'impact compresses the rendered ball');
    assert.equal(g.ready,true,'the next drop is ready before landing');
    for(let i=0;i<Math.ceil(3/dt);i++)g.update(dt);
    assert.ok(Math.abs(ball.vy)<.1&&ball.pulse<.001,'the bounce quickly settles');
    assert.ok(ball.y+ball.r<=.940001,'faster falling does not tunnel through the floor');
  }
  const g=new FallingMerge(()=>0),a=g.make(0,.5,.55,0,1.4),b=g.make(1,.5,.62);
  a.wait=b.wait=0;g.balls.push(a,b);g.update(1/120);
  assert.ok(b.vy>a.vy,'unlike balls rebound from each other');
  assert.ok(a.pulse>.04&&b.pulse>.04,'both balls show contact feedback');
});
test('the largest falling circles remain stable and a pile above the limit ends after a grace period',()=>{
  const g=new FallingMerge(()=>0),r=orbRadii.at(-1);
  for(let i=0;i<3;i++){const b=g.make(orbRadii.length-1,.5,.94-r-i*r*2);b.age=2;g.balls.push(b);}
  assert.equal(g.over,false);for(let i=0;i<400&&!g.over;i++)g.update(1/120);
  assert.equal(g.over,true);assert.ok(g.balls.every(b=>Number.isFinite(b.y)));
});
test('free flight stays on the ground without teleporting and can lift away at every frame rate',()=>{
  for(const dt of [1/120,1/30,.1]){
    const world=[{position:[70,30],radius:100}],s=createVehicle('autumn',{x:70,y:.2,z:30,yaw:0});
    for(let i=0;i<1/dt;i++)advanceVehicle(s,{throttle:1},dt,world,[]);
    assert.equal(s.y,.12);const start={...s};
    for(let i=0;i<1/dt;i++)advanceVehicle(s,{throttle:-1},dt,world,[]);
    assert.ok(s.y>start.y+3);assert.ok(Math.hypot(s.x-start.x,s.z-start.z)<20);
    const wall={x:s.x,z:s.z+3,radius:0,halfX:5,halfZ:.1,base:0,height:9};
    for(let i=0;i<.5/dt;i++)advanceVehicle(s,{throttle:1},dt,world,[wall]);
    assert.ok(s.z+.55<=wall.z-.1+.0001);const y=s.y;
    for(let i=0;i<2/dt;i++)advanceVehicle(s,{throttle:-1},dt,world,[wall]);
    assert.ok(s.y>y+4,'contact never disables lift');
  }
});
test('distant islands are solid for sea and air travel without enlarging the walkable map',()=>{
  for(const island of distantIslands){
    assert.equal(flightFloor(island.x,island.z,regions),-3.79);
    assert.equal(waterClear(island.x,island.z,regions),false);
    const s=createVehicle('autumn',{x:island.x,y:-3.78,z:island.z+island.rz*.7,yaw:Math.PI});
    for(let i=0;i<40;i++)advanceVehicle(s,{throttle:1},1/120,regions,[]);
    assert.ok(s.y>=-3.67);const y=s.y;
    for(let i=0;i<60;i++)advanceVehicle(s,{throttle:-1},1/120,regions,[]);
    assert.ok(s.y>y+1);
  }
});
test('race rings fit on supported land and the guidance slides with continuous arc phase',()=>{
  const c=makeCourse('spring',regions);
  assert.ok(c.gates.every(g=>supportedFootprint(g.x,g.z,regions,1.85)));
  const race=createRace(makeCourse('autumn',regions)),i=race.course.gateIndices[1]-3,p=race.course.path[i],q=race.course.path[i+1];
  const a=guidanceWindow(race,p),b=guidanceWindow(race,{x:p.x+(q.x-p.x)*.01,y:p.y+(q.y-p.y)*.01,z:p.z+(q.z-p.z)*.01});
  assert.ok(a.length>40);assert.ok(Math.abs(a[0].arc-b[0].arc)<.02);assert.notEqual(a[0].arc,b[0].arc);
  assert.ok(fadeGate(1,0,1/60)>0&&fadeGate(1,0,1/60)<1);let opacity=1;
  for(let i=0;i<12;i++)opacity=fadeGate(opacity,0,1/60);assert.ok(opacity<.01);
});
test('breakout ball pace is independent of clears; descent accelerates smoothly with bounded limits',()=>{
  const a=new Arcade('bricks'),b=new Arcade('bricks');a.hits=500;a.clearedRows=100;
  for(const t of [0,30,120,600,12000]){a.activeTime=b.activeTime=t;assert.equal(a.ballSpeed,b.ballSpeed);assert.ok(a.ballSpeed<=1.32);}
  b.activeTime=12000;assert.equal(b.descentTarget,.0048);
  a.serving=false;a.ball={x:.5,y:.7,vx:.6,vy:0};const before=a.rowSpeed;a.update(.1);
  assert.ok(a.rowSpeed>before&&a.rowSpeed-before<.00015);
  assert.ok(a.descentTarget<.0102);assert.ok(a.ballSpeed<=1.32);
});
test('a fresh small ball visibly pushes the largest floor ball, consistently at 10–120 Hz',()=>{
  const positions=[];
  for(const dt of [1/120,1/30,.1]){
    const g=new FallingMerge(()=>0),big=g.make(8,.5,.94-orbRadii[8]);big.age=2;big.wait=0;g.balls.push(big);g.aim=.38;g.drop();
    for(let i=0;i<1.4/dt;i++)g.update(dt);
    assert.ok(big.x>.56,'off-centre impact moves the large ball at least 29 canvas pixels');
    assert.ok(big.y+big.r<=.940001);assert.ok(g.balls.every(b=>Number.isFinite(b.vx)&&Number.isFinite(b.vy)));
    positions.push(big.x);
  }
  assert.ok(Math.max(...positions)-Math.min(...positions)<.001);
});
test('optimal memory play averages eight to nine complete pair boards before health runs out',()=>{
  let completed=0;
  for(let trial=0;trial<1500;trial++){
    const g=new Arcade('pairs',seededRandom(7000+trial)),seen=new Map();
    while(!g.over){
      if(g.boardDelay){for(let i=0;i<7;i++)g.update(.1);seen.clear();}
      let pair=null;
      for(const [i,v] of seen)for(const [j,w] of seen)if(i!==j&&v===w)pair=[i,j];
      const a=pair?.[0]??g.cards.findIndex((_,i)=>!g.matched.includes(i)&&!seen.has(i)),v=g.cards[a];
      const b=pair?.[1]??[...seen].find(([,w])=>w===v)?.[0]??g.cards.findIndex((_,i)=>i!==a&&!g.matched.includes(i)&&!seen.has(i));
      g.flip(a);g.flip(b);
      if(v===g.cards[b]){seen.delete(a);seen.delete(b);}else{seen.set(a,v);seen.set(b,g.cards[b]);for(let i=0;i<9;i++)g.update(.1);}
    }
    completed+=g.boards;
  }
  const mean=completed/1500;assert.ok(mean>8.2&&mean<8.9,`mean completed boards: ${mean}`);
});
