import {walkable} from './navigation.mjs';
import {groundHeight} from './terrain-height.mjs';
/** Small grid A*: authored trails follow the same walls and shore boundaries as walkers. */
export function findTrail(start,end,regions,obstacles,step=.7){
  if(!walkable(start.x,start.z,regions,obstacles)||!walkable(end.x,end.z,regions,obstacles))return [];
  const origin={x:Math.min(start.x,end.x)-12,z:Math.min(start.z,end.z)-12};
  const point=(x,z)=>({x:origin.x+x*step,z:origin.z+z*step});
  const a={x:Math.round((start.x-origin.x)/step),z:Math.round((start.z-origin.z)/step)},b={x:Math.round((end.x-origin.x)/step),z:Math.round((end.z-origin.z)/step)};
  const key=(x,z)=>`${x},${z}`,h=(x,z)=>Math.hypot(x-b.x,z-b.z),open=[{...a,g:0,f:h(a.x,a.z)}],cost=new Map([[key(a.x,a.z),0]]),previous=new Map();
  const maxX=Math.ceil((Math.max(start.x,end.x)+12-origin.x)/step),maxZ=Math.ceil((Math.max(start.z,end.z)+12-origin.z)/step);
  const cells=new Map(),edges=new Map();
  const clear=(x,z)=>{const id=key(x,z);if(cells.has(id))return cells.get(id);const p=point(x,z),value=x>=0&&z>=0&&x<=maxX&&z<=maxZ&&walkable(p.x,p.z,regions,obstacles);cells.set(id,value);return value;};
  const connected=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1);let y=groundHeight(a.x,a.z,regions);for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,next=groundHeight(x,z,regions);if(Math.abs(next-y)>.22||!walkable(x,z,regions,obstacles,next))return false;y=next;}return true;};
  if(!clear(a.x,a.z)||!clear(b.x,b.z))return [];
  if(!connected(start,point(a.x,a.z))||!connected(point(b.x,b.z),end))return [];
  for(let count=0;open.length&&count<12000;count++){
    open.sort((a,b)=>b.f-a.f);const current=open.pop(),id=key(current.x,current.z);if(current.g!==cost.get(id))continue;
    if(current.x===b.x&&current.z===b.z){const path=[end];let at=id;while(at){const [x,z]=at.split(',').map(Number);path.push(point(x,z));at=previous.get(at);}path.push(start);return path.reverse();}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const x=current.x+dx,z=current.z+dz;if(!clear(x,z)||dx&&dz&&(!clear(current.x+dx,current.z)||!clear(current.x,current.z+dz)))continue;
      const edge=[id,key(x,z)].sort().join('|');if(!edges.has(edge))edges.set(edge,connected(point(current.x,current.z),point(x,z)));if(!edges.get(edge))continue;
      const next=key(x,z),g=current.g+Math.hypot(dx,dz);if(g>=(cost.get(next)??Infinity))continue;
      cost.set(next,g);previous.set(next,id);open.push({x,z,g,f:g+h(x,z)});
    }
  }
  return [];
}
