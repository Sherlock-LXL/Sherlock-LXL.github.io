import * as T from 'three';
import {groundHeight} from '../../shared/terrain-height.mjs';
import type {Catalog} from '../core/types';

type Trace={x:number;y:number;z:number;yaw:number;age:number;color:T.Color};
const colors:Record<string,string>={
  nexus:'#b9964f',
  'ai-mountain':'#c77f9e',
  'science-valley':'#72aebe',
  'personal-museum':'#b88435',
  'weiming-studio':'#54a788',
};

/** A one-draw-call trail plus two pooled arrival rings. */
export class TravelerEffects{
  private traces:T.InstancedMesh;
  private marks:(Trace|null)[]=Array(28).fill(null);
  private cursor=0;private side=1;private last=new T.Vector2();private accumulated=0;
  private pose=new T.Object3D();private arrivals:{mesh:T.Mesh;material:T.MeshBasicMaterial;age:number}[]=[];
  constructor(private scene:T.Scene,private catalog:Catalog){
    const geometry=new T.CircleGeometry(.15,10);
    const material=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
    this.traces=new T.InstancedMesh(geometry,material,this.marks.length);this.traces.name='traveler-traces';this.traces.frustumCulled=false;this.traces.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(this.traces);
    for(let i=0;i<this.marks.length;i++){this.pose.scale.setScalar(0);this.pose.updateMatrix();this.traces.setMatrixAt(i,this.pose.matrix);}
    for(let i=0;i<2;i++){
      const ringMaterial=new T.MeshBasicMaterial({color:'#d9c58e',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
      const ring=new T.Mesh(new T.RingGeometry(.65,.7,48),ringMaterial);ring.rotation.x=-Math.PI/2;ring.visible=false;ring.renderOrder=4;scene.add(ring);
      this.arrivals.push({mesh:ring,material:ringMaterial,age:10});
    }
  }
  get snapshot(){return {activeMarks:this.marks.filter(Boolean).length,arrivalActive:this.arrivals.some(arrival=>arrival.mesh.visible)};}
  reset(x:number,z:number){this.last.set(x,z);this.accumulated=0;}
  enter(region:string,x:number,z:number){
    const color=colors[region]??colors.nexus,y=groundHeight(x,z,this.catalog.regions)+.045;
    this.arrivals.forEach((arrival,i)=>{arrival.age=-i*.16;arrival.mesh.position.set(x,y+i*.006,z);arrival.material.color.set(color);arrival.mesh.visible=true;});
    this.reset(x,z);
  }
  update(dt:number,x:number,z:number,y:number,yaw:number,moving:boolean,grounded:boolean,reduced:boolean,region:string){
    if(!this.last.lengthSq())this.last.set(x,z);
    const distance=this.last.distanceTo(new T.Vector2(x,z));
    if(distance>3){this.reset(x,z);}
    else if(moving&&grounded&&!reduced){
      this.accumulated+=distance;this.last.set(x,z);
      if(this.accumulated>=.72){this.accumulated%=.72;this.add(x,z,y,yaw,region);}
    }else this.last.set(x,z);
    for(let i=0;i<this.marks.length;i++){
      const mark=this.marks[i];if(!mark){this.pose.scale.setScalar(0);}
      else{
        mark.age+=dt;const life=3.6,t=Math.min(1,mark.age/life),fade=Math.max(0,1-t);
        if(!fade){this.marks[i]=null;this.pose.scale.setScalar(0);}
        else{
          this.pose.position.set(mark.x,mark.y,mark.z);this.pose.rotation.set(-Math.PI/2,0,-mark.yaw);
          this.pose.scale.set(.58*fade,1.12*fade,1);this.traces.setColorAt(i,mark.color);
        }
      }
      this.pose.updateMatrix();this.traces.setMatrixAt(i,this.pose.matrix);
    }
    this.traces.instanceMatrix.needsUpdate=true;if(this.traces.instanceColor)this.traces.instanceColor.needsUpdate=true;
    for(const arrival of this.arrivals){
      arrival.age+=dt;if(arrival.age<0)continue;
      const t=arrival.age/1.35;arrival.mesh.visible=t<1;
      if(t<1){arrival.mesh.scale.setScalar(.8+t*4.8);arrival.material.opacity=(1-t)*.24;}
    }
  }
  private add(x:number,z:number,y:number,yaw:number,region:string){
    const rightX=Math.cos(yaw),rightZ=-Math.sin(yaw),side=this.side;this.side*=-1;
    this.marks[this.cursor]={x:x+rightX*side*.14,y:y+.035,z:z+rightZ*side*.14,yaw,age:0,color:new T.Color(colors[region]??colors.nexus)};
    this.cursor=(this.cursor+1)%this.marks.length;
  }
  dispose(){
    this.scene.remove(this.traces);this.traces.geometry.dispose();(this.traces.material as T.Material).dispose();
    for(const arrival of this.arrivals){this.scene.remove(arrival.mesh);arrival.mesh.geometry.dispose();arrival.material.dispose();}
  }
}
