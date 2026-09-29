/** @typedef {{x:number,y:number,z:number}} RoutePoint */
/** @typedef {{name:string,kind:string,width:number,points:RoutePoint[]}} MountainRoute */
/** @type {WeakMap<object, MountainRoute[]>} */
const cache=new WeakMap();
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** A broad single grade prevents the adjacent flat bridge and uphill route from
 * competing for the nearest-height sample across the width of the entrance. */
export function entranceSurface(x,z,height,region){
 const first=region.terrain?.terraces[0],spawn=region.spawn;if(!first||!spawn)return height;
 const end=first.center[1]+6.6,start=spawn[1]-.5;if(z<end||start<=end)return height;
 const weight=1-smooth((Math.abs(x-spawn[0])-1.65)/1.35);
 return height+(first.height*smooth((start-z)/(start-end))-height)*weight;
}
/** Rounded, authored switchbacks; unrelated to the collision planner's grid resolution. */
export function roundRoute(points,rounding=2){
  const nodes=points.map(([x,z,y])=>({x,z,y})),result=[nodes[0]];
  const line=(a,b)=>{const count=Math.max(1,Math.ceil(distance(a,b)/.3));for(let i=1;i<=count;i++)result.push(mix(a,b,i/count));};
  for(let i=1;i<nodes.length-1;i++){
    const a=nodes[i-1],b=nodes[i],c=nodes[i+1],cut=Math.min(rounding,distance(a,b)*.28,distance(b,c)*.28),entry=mix(b,a,cut/distance(a,b)),exit=mix(b,c,cut/distance(b,c));
    line(result[result.length-1],entry);
    for(let j=1;j<=12;j++){const t=j/12;result.push(mix(mix(entry,b,t),mix(b,exit,t),t));}
  }
  line(result[result.length-1],nodes[nodes.length-1]);return result;
}
/** @returns {MountainRoute[]} */
export function mountainRoutes(region){
  if(cache.has(region))return cache.get(region);
  const t=region.terrain;
  /** @type {MountainRoute[]} */
  const routes=[];
  if(t?.route){routes.push({name:'登山主路',kind:'main',width:t.route.width,points:roundRoute(t.route.points).map(p=>({...p,y:entranceSurface(p.x,p.z,p.y,region)}))});for(const s of t.shortcuts)if(s.profile)routes.push({name:s.title,kind:'shortcut',width:1.9,points:roundRoute(s.profile,1.6)});}
  cache.set(region,routes);return routes;
}
export function closestRoute(x,z,route){
  let bestDistance=Infinity,bestY=0;
  for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;if(!len)continue;
    const ax=x-a.x,az=z-a.z;
    const bx=Math.max(0,Math.abs(x-(a.x+b.x)*.5)-Math.abs(dx)*.5),bz=Math.max(0,Math.abs(z-(a.z+b.z)*.5)-Math.abs(dz)*.5);
    if(bx*bx+bz*bz>=bestDistance)continue;
    const t=Math.max(0,Math.min(1,(ax*dx+az*dz)/len)),ex=ax-t*dx,ez=az-t*dz,d=ex*ex+ez*ez;
    if(d<bestDistance){bestDistance=d;bestY=a.y+(b.y-a.y)*t;}
  }
  return {distance:Math.sqrt(bestDistance),y:bestY};
}
/** Outside the road centre, blend nearby legs instead of jumping between
 * different elevations at a nearest-segment boundary on a hairpin. */
export function hillsideRoute(x,z,route){
 const hit=closestRoute(x,z,route);
 if(hit.distance<.35||hit.distance>route.width/2+1.6)return hit;
 let sum=0,weight=0;
 for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;if(!len)continue;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len)),ex=x-a.x-t*dx,ez=z-a.z-t*dz;
  const delta=ex*ex+ez*ez-hit.distance**2;if(delta>5)continue;
  const w=Math.exp(-delta/1.2)*Math.sqrt(len);sum+=(a.y+(b.y-a.y)*t)*w;weight+=w;
 }
 return {...hit,y:hit.y+(sum/weight-hit.y)*smooth((hit.distance-.35)/.55)};
}
const landingCache=new WeakMap();
/** @returns {{x:number,z:number,y:number,radius:number}[]} */
export function landings(region){if(!landingCache.has(region))landingCache.set(region,(region.terrain?.terraces??[]).map(t=>({x:t.center[0],z:t.center[1]+6.6,y:t.height,radius:3.35})));return landingCache.get(region);}
