import * as T from 'three';
import {guidanceWindow} from '../../shared/race-guidance.mjs';
import type {createRace} from '../../shared/seasonal-games.mjs';

/** One small local ribbon follows the ordered route; no full-world overlapping lines. */
export class RouteGuide{
  readonly root=new T.Group();
  private geometry=new T.BufferGeometry();private positions=new T.Float32BufferAttribute(new Float32Array(512*3),3);
  private colors=new T.Float32BufferAttribute(new Float32Array(512*3),3);private distances=new Float32Array(512);
  private lineMaterial=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9});
  private lightMaterial=new T.PointsMaterial({vertexColors:true,size:.13,transparent:true,opacity:.72,depthWrite:false});
  private count=0;private clock=.2;private flow=0;
  constructor(){
    this.geometry.setAttribute('position',this.positions);this.geometry.setAttribute('color',this.colors);
    const line=new T.Line(this.geometry,this.lineMaterial),lights=new T.Points(this.geometry,this.lightMaterial);
    line.frustumCulled=lights.frustumCulled=false;this.root.name='race-local-guidance';this.root.add(line,lights);
  }
  update(race:ReturnType<typeof createRace>,position:{x:number;y:number;z:number},dt:number,reduced:boolean){
    this.root.visible=!race.leisure&&!race.finished;if(!this.root.visible)return;
    this.clock+=dt;this.flow+=dt*6;
    if(this.clock>.1){
      this.clock=0;const points=guidanceWindow(race,position);this.count=Math.min(512,points.length);let arc=0;
      for(let i=0;i<this.count;i++){
        const p=points[i];if(i){const a=points[i-1];arc+=Math.hypot(p.x-a.x,p.y-a.y,p.z-a.z);}
        this.positions.setXYZ(i,p.x,p.y+(race.course.id==='autumn'?.03:.16),p.z);this.distances[i]=arc;
      }
      this.positions.needsUpdate=true;this.geometry.setDrawRange(0,this.count);
    }
    for(let i=0;i<this.count;i++){
      const phase=((this.distances[i]-this.flow)%9+9)%9,glow=reduced?0:Math.exp(-(((phase-4.5)/.75)**2));
      const edge=Math.min(1,this.distances[i]/2,(this.distances[this.count-1]-this.distances[i])/3);
      const strength=(.28+.72*glow)*Math.max(0,edge);
      this.colors.setXYZ(i,strength,strength*(.68+.25*glow),strength*(.3+.4*glow));
    }
    this.colors.needsUpdate=true;
  }
  get snapshot(){return {points:this.count,flow:this.flow,visible:this.root.visible};}
  reset(){this.clock=.2;this.root.visible=false;}
  dispose(){this.geometry.dispose();this.lineMaterial.dispose();this.lightMaterial.dispose();this.root.removeFromParent();}
}
