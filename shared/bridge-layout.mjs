/** Shared dimensions for the stone arch geometry and under-bridge navigation. */
export function bridgeLayout(region){
  const [x,z]=region.position,distance=Math.hypot(x,z),start=8.4,end=distance-region.radius+.6,length=end-start,mid=(start+end)/2;
  const span=length-3,pier=1.05,count=Math.max(1,Math.round(span/5.4)),arch=(span-pier*(count-1))/count,radius=arch/2;
  const centres=Array.from({length:count},(_,i)=>-span/2+radius+i*(arch+pier));
  return {distance,start,end,length,mid,radius,centres,ux:x/distance,uz:z/distance,half:2.8,crown:-.9,spring:-.9-radius};
}
