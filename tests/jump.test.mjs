import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalker,advanceWalker,GRAVITY,JUMP_SPEED } from '../shared/locomotion.mjs';
import {supportedFootprint,bodyFootprint} from '../shared/navigation.mjs';
const regions=[{position:[0,0],radius:17}];
const input=(x=0,z=0,jump=false)=>({x,z,jump});
function simulate(state,obstacles,seconds,velocity=input(),dt=1/60){
  let peak=state.y;
  for(let t=0;t<seconds-.00001;t+=dt){advanceWalker(state,{...velocity,jump:velocity.jump&&t===0},Math.min(dt,seconds-t),regions,obstacles);peak=Math.max(peak,state.y);}
  return peak;
}
test('jump follows a gravity arc, lands exactly, and does not double-jump',()=>{
  const state=createWalker();const peak=simulate(state,[],1,input(0,0,true));
  assert.ok(Math.abs(peak-JUMP_SPEED**2/(2*GRAVITY))<.01);assert.equal(state.y,0);assert.equal(state.grounded,true);
  advanceWalker(state,input(0,0,true),.1,regions,[]);const velocity=state.vy;
  advanceWalker(state,input(0,0,true),.1,regions,[]);assert.ok(state.vy<velocity);
});
test('a low obstacle blocks walking, permits jumping over it, and supports landing',()=>{
  const obstacle={x:2,z:0,radius:0,halfX:.2,halfZ:2,height:.7};
  const walking=createWalker();simulate(walking,[obstacle],1,input(5.2));assert.ok(walking.x<1.46);
  const jumping=createWalker();simulate(jumping,[obstacle],1,input(5.2,0,true));assert.ok(jumping.x>5);assert.equal(jumping.y,0);
  const landing={...createWalker(2,0),y:2,vy:-1,grounded:false};simulate(landing,[obstacle],1);assert.equal(landing.y,.7);assert.equal(landing.grounded,true);
  simulate(landing,[obstacle],1,input(5.2));assert.equal(landing.y,0);assert.equal(landing.grounded,true);
});
test('sprint jumps cannot tunnel through tall walls or escape the island boundary',()=>{
  const wall={x:2,z:0,radius:0,halfX:.12,halfZ:3,height:4.8};
  const state=createWalker();simulate(state,[wall],1.2,input(8.5,0,true),.1);assert.ok(state.x<1.54);assert.equal(state.y,0);
  const edge=createWalker(15,0);simulate(edge,[],1.2,input(8.5,0,true),.1);assert.ok(edge.x<16.2);assert.equal(edge.y,0);
});
test('curbs auto-step and jumping off raised supports returns to the correct floor',()=>{
  const curb={x:1,z:0,radius:0,halfX:.5,halfZ:1,height:.15};
  const state=createWalker();simulate(state,[curb],.2,input(5));assert.equal(state.y,.15);
  const peak=simulate(state,[curb],1,input(0,0,true));assert.ok(peak>1.59);assert.equal(state.y,.15);
});
test('short collision substeps give matching motion at 10 and 120 frames per second',()=>{
  const slow=createWalker(),fast=createWalker();
  simulate(slow,[],1,input(5.2,0,true),.1);simulate(fast,[],1,input(5.2,0,true),1/120);
  assert.ok(Math.abs(slow.x-fast.x)<1e-6);assert.equal(slow.y,fast.y);assert.equal(slow.grounded,fast.grounded);
});
test('uneven paving and small steps are crossed both ways without jumping or losing ground',()=>{
  const steps=[{x:1,z:0,halfX:.3,halfZ:2,radius:0,height:.38},{x:2.4,z:0,halfX:.3,halfZ:2,radius:0,height:.45}];
  const p=createWalker();
  for(const direction of [1,-1])for(let i=0;i<96;i++){
    advanceWalker(p,input(direction*5),1/120,regions,steps);
    assert.equal(p.grounded,true);assert.equal(p.vy,0);
  }
  assert.ok(Math.abs(p.x)<.01);
  const mount=createWalker(),curb={x:1,z:0,halfX:.3,halfZ:2,radius:0,height:.52};
  for(let i=0;i<100;i++)advanceWalker(mount,input(5),1/120,regions,[curb],{stepHeight:.55,radius:.48});
  assert.ok(mount.x>4);assert.equal(mount.grounded,true);
});
test('a mount can leave its island, cross bridges and the hub, and enter a different island',()=>{
  const world=[{position:[30,0],radius:12},{position:[0,30],radius:12}],p=createWalker(23,0,world);
  for(const [x,z] of [[8,0],[5,5],[0,8],[0,23]]){
    for(let i=0;i<2000&&Math.hypot(x-p.x,z-p.z)>.06;i++){
      const d=Math.hypot(x-p.x,z-p.z),yaw=Math.atan2(x-p.x,z-p.z),footprint=bodyFootprint(yaw,.53);
      advanceWalker(p,input((x-p.x)/d*7.5,(z-p.z)/d*7.5),1/120,world,[],{
        radius:.48,footprint,stepHeight:.55,canEnter:(x,z)=>supportedFootprint(x,z,world,.48,footprint),
      });
    }
    assert.ok(Math.hypot(x-p.x,z-p.z)<.07,`reached ${x},${z}`);assert.equal(p.grounded,true);
  }
  assert.equal(supportedFootprint(15,4,world,.48),false,'the sea remains outside the travel area');
});
test('step contact resolves immediately while the eye rises smoothly and jump physics remain independent',()=>{
  const p=createWalker(),curb={x:1,z:0,halfX:.4,halfZ:2,radius:0,height:.42};
  let last=p.y,largest=0;
  for(let i=0;i<90;i++){
    advanceWalker(p,input(1),1/120,regions,[curb]);
    const visible=p.y+p.stepOffset;largest=Math.max(largest,visible-last);last=visible;
    assert.equal(p.grounded,true);
  }
  assert.equal(p.y,.42);assert.ok(largest<.065);assert.ok(Math.abs(p.stepOffset)<.002);
  advanceWalker(p,input(0,0,true),1/120,regions,[curb]);assert.ok(p.vy>0);assert.equal(p.grounded,false);
});
