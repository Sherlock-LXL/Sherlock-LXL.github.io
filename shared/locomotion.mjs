import { onGround,overlaps,walkable } from './navigation.mjs';
import {groundHeight} from './terrain-height.mjs';
export const GRAVITY=22;
export const JUMP_SPEED=8;
export const STEP_HEIGHT=.22;
export function createWalker(x=0,z=0,regions=[]){return {x,y:groundHeight(x,z,regions),z,vy:0,grounded:true};}
function topAt(x,z,obstacles,regions){
  let top=groundHeight(x,z,regions);
  for(const obstacle of obstacles)if(overlaps(x,z,obstacle))top=Math.max(top,obstacle.height??Infinity);
  return top;
}
/** Feet position, swept vertical landing, and short collision substeps. No renderer dependency. */
export function advanceWalker(state,input,dt,regions,obstacles){
  if(input.jump&&state.grounded){state.vy=JUMP_SPEED;state.grounded=false;}
  const steps=Math.max(1,Math.ceil(Math.min(.1,Math.max(0,dt))/(1/120))),h=Math.min(.1,Math.max(0,dt))/steps;
  for(let i=0;i<steps;i++){
    const before=state.y;
    state.y+=state.vy*h-GRAVITY*h*h/2;state.vy-=GRAVITY*h;
    const floor=topAt(state.x,state.z,obstacles,regions);
    if(state.vy<=0&&before>=floor-.002&&state.y<=floor){state.y=floor;state.vy=0;state.grounded=true;}else state.grounded=false;
    for(const axis of ['x','z']){
      const x=state.x+(axis==='x'?input.x*h:0),z=state.z+(axis==='z'?input.z*h:0);
      if(!onGround(x,z,regions))continue;
      const top=topAt(x,z,obstacles,regions);
      if(state.grounded&&Math.abs(top-state.y)<=STEP_HEIGHT){state.y=top;state[axis]=axis==='x'?x:z;}
      else if(walkable(x,z,regions,obstacles,state.y))state[axis]=axis==='x'?x:z;
    }
    // Leaving a ledge starts falling on the next substep; never jump again in mid-air.
    if(topAt(state.x,state.z,obstacles,regions)<state.y-.002)state.grounded=false;
    const terrainFloor=groundHeight(state.x,state.z,regions);
    if(state.y<terrainFloor){state.y=terrainFloor;state.vy=0;state.grounded=true;}
  }
  return state;
}
