/** Ordered route windows avoid picking a later crossing just because it is nearby. */
export function guidanceWindow(race,position){
  const {path,gateIndices}=race.course,n=path.length-1;
  const gate=(race.next-1+gateIndices.length)%gateIndices.length;
  const start=gateIndices[gate],end=race.next===0?n:gateIndices[race.next];
  let closest=start,distance=Infinity;
  for(let i=start;i<=end;i++){
    const p=path[i],d=(p.x-position.x)**2+(p.z-position.z)**2+(p.y-position.y)**2;
    if(d<distance){distance=d;closest=i;}
  }
  const points=[];let length=0;
  for(let i=closest;i>start&&length<5;i--){const a=path[i],b=path[i-1];length+=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);closest=i-1;}
  const lastIndex=(race.next+1)%gateIndices.length;
  let last=gateIndices[lastIndex];if(last<=closest)last+=n;
  length=0;
  for(let i=closest;i<=last&&length<42;i++){
    const p=path[i%n];points.push(p);
    if(points.length>1){const a=points.at(-2);length+=Math.hypot(a.x-p.x,a.y-p.y,a.z-p.z);}
  }
  return points;
}
export function gateVisibility(next,index,count,finished=false){
  if(finished)return 0;
  const ahead=(index-next+count)%count;
  return ahead===0?1:ahead===1?.48:ahead===2?.10:0;
}
