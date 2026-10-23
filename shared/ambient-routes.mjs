const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

/** Both ends of a flight dissolve before the route is recycled. */
export const flightOpacity=progress=>smooth(0,.14,progress)*(1-smooth(.78,1,progress));
export const birdDaylight=hour=>smooth(5.25,6.25,hour)*(1-smooth(18.75,20,hour));

function segmentDistance(x,z,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-ax-dx*t,z-az-dz*t);
}
/** Check the whole jump, including the fish's body, against shores, the harbor and traffic. */
export function fishRouteClear(route,regions){
  const {x,z,angle,travel}=route,dx=Math.cos(angle)*travel,dz=Math.sin(angle)*travel;
  if(Math.max(Math.hypot(x-dx,z-dz),Math.hypot(x+dx,z+dz))+1>76)return false;
  const shores=[{position:[0,0],radius:12},{position:[0,27],radius:14},...regions];
  return shores.every(r=>segmentDistance(r.position[0],r.position[1],x-dx,z-dz,x+dx,z+dz)>r.radius*1.12+3);
}
export function chooseFishRoute(random,regions){
  for(let i=0;i<80;i++){
    const a=random()*Math.PI*2,r=Math.sqrt(44**2+random()*(72**2-44**2));
    const route={x:Math.cos(a)*r,z:Math.sin(a)*r,angle:random()*Math.PI*2,travel:1.5+random()*1.3};
    if(fishRouteClear(route,regions))return route;
  }
  return null;
}
