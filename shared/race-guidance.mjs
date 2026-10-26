const cache=new WeakMap();
function routeArcs(course){
  if(cache.has(course))return cache.get(course);
  const arcs=[0],{path}=course;
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];arcs.push(arcs.at(-1)+Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z));}
  cache.set(course,arcs);return arcs;
}
/** Project onto the current ordered leg, then sample a continuously moving window. */
export function guidanceWindow(race,position){
  const {path,gateIndices}=race.course,n=path.length-1,arcs=routeArcs(race.course),total=arcs[n];
  const gate=(race.next-1+gateIndices.length)%gateIndices.length,start=gateIndices[gate],end=race.next===0?n:gateIndices[race.next];
  let closest=arcs[start],distance=Infinity;
  for(let i=start;i<end;i++){
    const a=path[i],b=path[i+1],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.y-a.y)*dy+(position.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz||1)));
    const d=(a.x+dx*t-position.x)**2+(a.y+dy*t-position.y)**2+(a.z+dz*t-position.z)**2;
    if(d<distance){distance=d;closest=arcs[i]+(arcs[i+1]-arcs[i])*t;}
  }
  const ahead=(race.next+2)%gateIndices.length;
  let last=arcs[gateIndices[ahead]];if(last<=closest)last+=total;
  const low=Math.max(0,closest-6),high=Math.min(closest+58,last),points=[];
  for(let arc=low;arc<=high+.00001;arc+=.5){
    const at=arc%total;let a=0,b=n;
    while(b-a>1){const mid=(a+b)>>1;if(arcs[mid]<=at)a=mid;else b=mid;}
    const t=(at-arcs[a])/(arcs[b]-arcs[a]||1),p=path[a],q=path[b];
    points.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t,z:p.z+(q.z-p.z)*t,arc:arc+((race.lap??1)-1)*total});
  }
  return points;
}
export function gateVisibility(next,index,count,finished=false){
  if(finished)return 0;
  const ahead=(index-next+count)%count;
  return ahead===0?1:ahead===1?.60:ahead===2?.28:0;
}
export function fadeGate(current,target,dt){return Math.abs(current-target)<.002?target:current+(target-current)*(1-Math.exp(-dt*24));}
