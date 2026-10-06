import * as T from 'three';
import {resonantRegions} from '../../shared/ambient-response.mjs';
import type {Discovery,Region} from '../core/types';
import type {EventBus} from '../core/events';

export class WorldResonance{
  private nodes:T.InstancedMesh;
  private motes:T.InstancedMesh;
  private pose=new T.Object3D();
  private active:Set<string>;
  private pulse:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>;
  private pulseAge=10;private time=0;private unsubscribe:()=>void;
  private coreRegions:Region[];
  constructor(private hub:T.Group,regions:Region[],entries:Discovery[],bus:EventBus,found:ReadonlySet<string>){
    this.coreRegions=regions.filter(region=>entries.some(entry=>entry.regionId===region.id));
    this.active=resonantRegions(entries,found);
    const nodeMaterial=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.9,depthWrite:false});
    this.nodes=new T.InstancedMesh(new T.OctahedronGeometry(.18,1),nodeMaterial,this.coreRegions.length);this.nodes.name='resonance-nodes';this.nodes.frustumCulled=false;hub.add(this.nodes);
    this.motes=new T.InstancedMesh(new T.OctahedronGeometry(.055,0),new T.MeshBasicMaterial({color:'#f7e4ad',transparent:true,opacity:.8,depthWrite:false}),12);this.motes.name='resonance-crown';this.motes.frustumCulled=false;hub.add(this.motes);
    this.pulse=new T.Mesh(new T.RingGeometry(2.3,2.37,64),new T.MeshBasicMaterial({color:'#d7f0ef',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
    this.pulse.rotation.x=-Math.PI/2;this.pulse.position.y=.5;this.pulse.visible=false;hub.add(this.pulse);
    this.refresh(0,true);
    this.unsubscribe=bus.on('discover',entry=>{
      const before=this.active.size;if(entry.regionId)this.active.add(entry.regionId);
      if(this.active.size!==before){this.pulse.material.color.set(entry.color);this.pulseAge=0;}
    });
  }
  get snapshot(){return {active:this.active.size,total:this.coreRegions.length,complete:this.active.size===this.coreRegions.length};}
  update(dt:number,reduced:boolean){
    if(!reduced)this.time+=dt;
    this.refresh(this.time,reduced);
    this.pulseAge+=dt;const progress=this.pulseAge/1.6;this.pulse.visible=progress<1;
    if(progress<1){this.pulse.scale.setScalar(.8+progress*2.5);this.pulse.material.opacity=(1-progress)*.45;}
  }
  private refresh(time:number,reduced:boolean){
    this.coreRegions.forEach((region,i)=>{
      const a=i/this.coreRegions.length*Math.PI*2+Math.PI/4,on=this.active.has(region.id),pulse=reduced?0:Math.sin(time*1.4+i)*.08;
      this.pose.position.set(Math.sin(a)*2.48,4.25+pulse,Math.cos(a)*2.48);this.pose.rotation.set(a*.3,a,time*.18+i);this.pose.scale.setScalar(on ? .95 : .38);this.pose.updateMatrix();
      this.nodes.setMatrixAt(i,this.pose.matrix);this.nodes.setColorAt(i,new T.Color(on?region.color:'#6c7771'));
    });
    const complete=this.active.size===this.coreRegions.length;
    for(let i=0;i<12;i++){
      if(complete){const a=i/12*Math.PI*2+time*.22;this.pose.position.set(Math.cos(a)*3.2,5.1+Math.sin(a*3+time)*.28,Math.sin(a)*3.2);this.pose.rotation.set(a,time*.4,a*.5);this.pose.scale.setScalar(.75);}
      else this.pose.scale.setScalar(0);
      this.pose.updateMatrix();this.motes.setMatrixAt(i,this.pose.matrix);
    }
    this.nodes.instanceMatrix.needsUpdate=true;if(this.nodes.instanceColor)this.nodes.instanceColor.needsUpdate=true;this.motes.instanceMatrix.needsUpdate=true;
  }
  dispose(){
    this.unsubscribe();this.hub.remove(this.nodes,this.motes,this.pulse);
    this.nodes.geometry.dispose();(this.nodes.material as T.Material).dispose();
    this.motes.geometry.dispose();(this.motes.material as T.Material).dispose();
    this.pulse.geometry.dispose();this.pulse.material.dispose();
  }
}
