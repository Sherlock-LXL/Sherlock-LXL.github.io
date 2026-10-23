import {bodyFootprint,supportedFootprint} from './navigation.mjs';
export const bikeBody={radius:.35,length:.64,step:.55};
export const bikeFootprint=yaw=>[...bodyFootprint(yaw,bikeBody.length),...bodyFootprint(yaw,bikeBody.length/2).filter(p=>p.x||p.z)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/** One capsule for wheels, frame and rider. Low steps remain the walker's responsibility. */
export function bikeContact(x,z,y,yaw,obstacles){
  let contact={depth:0,nx:0,nz:0};
  const touch=(depth,nx,nz)=>{if(depth>contact.depth)contact={depth,nx,nz};};
  for(const p of bikeFootprint(yaw)){
    const px=x+p.x,pz=z+p.z;
    for(const o of obstacles){
      if((o.height??Infinity)<=y+bikeBody.step||(o.base??-Infinity)>y+1.7)continue;
      if(o.halfX!==undefined){
        const dx=px-o.x,dz=pz-o.z,cx=clamp(dx,-o.halfX,o.halfX),cz=clamp(dz,-o.halfZ,o.halfZ),ex=dx-cx,ez=dz-cz,d=Math.hypot(ex,ez);
        if(d)touch(bikeBody.radius-d,ex/d,ez/d);
        else{
          const ax=o.halfX-Math.abs(dx),az=o.halfZ-Math.abs(dz);
          if(ax<az)touch(bikeBody.radius+ax,Math.sign(dx)||1,0);else touch(bikeBody.radius+az,0,Math.sign(dz)||1);
        }
      }else{
        let cx=o.x,cz=o.z;
        if(o.segment){
          const [ax,az,bx,bz]=o.segment,dx=bx-ax,dz=bz-az,t=clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1),0,1);
          cx=ax+dx*t;cz=az+dz*t;
        }
        const dx=px-cx,dz=pz-cz,d=Math.hypot(dx,dz);touch(bikeBody.radius+o.radius-d,d?dx/d:1,d?dz/d:0);
      }
    }
  }
  return contact;
}

/** Existing animal overlap never permits entering a different wall or prop. */
export function bikeObstruction(state,x,z,yaw,obstacles){
  let contact={depth:0,nx:0,nz:0};
  for(const o of obstacles){
    const next=bikeContact(x,z,state.y,yaw,[o]),before=bikeContact(state.x,state.z,state.y,state.yaw,[o]);
    if(next.depth>Math.max(.00001,before.depth+.000001)&&next.depth>contact.depth)contact=next;
  }
  return contact;
}

/** Resolve inward velocity while preserving tangent motion and escape from existing overlap. */
export function bikeMotion(state,dx,dz,regions,obstacles){
  const footprint=bikeFootprint(state.yaw);
  const safe=(x,z)=>supportedFootprint(x,z,regions,bikeBody.radius,footprint)&&bikeObstruction(state,x,z,state.yaw,obstacles).depth===0;
  if(safe(state.x+dx,state.z+dz))return {x:dx,z:dz,hit:false};
  const next=bikeObstruction(state,state.x+dx,state.z+dz,state.yaw,obstacles),inward=dx*next.nx+dz*next.nz;
  const slide={x:dx-Math.min(0,inward)*next.nx,z:dz-Math.min(0,inward)*next.nz};
  const velocity=state.vx*next.nx+state.vz*next.nz;
  if(velocity<0){state.vx-=velocity*next.nx;state.vz-=velocity*next.nz;}
  if(safe(state.x+slide.x,state.z+slide.z))return {...slide,hit:true};
  for(const p of Math.abs(dx)>Math.abs(dz)?[{x:dx,z:0},{x:0,z:dz}]:[{x:0,z:dz},{x:dx,z:0}])
    if(safe(state.x+p.x,state.z+p.z))return {...p,hit:true};
  return {x:0,z:0,hit:true};
}
