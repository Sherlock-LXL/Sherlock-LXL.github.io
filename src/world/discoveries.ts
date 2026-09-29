import * as T from 'three';
import {discoveryScore} from '../../shared/discovery-focus.mjs';
import { material,mesh,softBox } from './architecture';
import { type Obstacle } from './scenery';
import {batchStatic} from './optimizer';
import {pocketWonder} from './pocket-wonders';
import type { Discovery } from '../core/types';
import type { EventBus } from '../core/events';
import { advanceFlight } from '../../shared/atmosphere.mjs';

type Installation={info:Discovery;group:T.Group;parts:T.Object3D[];animate?:(time:number,energy:number)=>void;glints:T.Points;halo:T.MeshStandardMaterial;triggered:number;energy:number;phase:number};
const pastel=['#b8dcca','#ecc3d1','#e6d7a9','#bdcee9','#d6c2e5'];
const box=(g:T.Object3D,m:T.Material,w:number,h:number,d:number,x=0,y=0,z=0)=>mesh(g,softBox(w,h,d),m,x,y,z);

/** Small, data-driven installations; geometry is owned and disposed by the world scene. */
export class Discoveries {
  private items:Installation[]=[];private nearby:Installation|null=null;private elapsed=0;
  private releases:(()=>void)[]=[];
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  constructor(scene:T.Scene,entries:Discovery[],obstacles:Obstacle[],private bus:EventBus,found:ReadonlySet<string>){
    const stone=material('#fff0dc'),metal=material('#9aafa9',.45,.12);
    const sprite=document.createElement('canvas');sprite.width=sprite.height=32;const ink=sprite.getContext('2d')!,gradient=ink.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'#fff');gradient.addColorStop(.2,'#ffffffe0');gradient.addColorStop(1,'#ffffff00');ink.fillStyle=gradient;ink.fillRect(0,0,32,32);const sparkle=new T.CanvasTexture(sprite);this.releases.push(()=>sparkle.dispose());
    for(const info of entries){
      const group=new T.Group();group.name='discovery-'+info.id;group.position.set(info.x,info.y??0,info.z);group.scale.setScalar(info.scale??1);group.rotation.y=Math.atan2(-info.position[0],10-info.position[1]);scene.add(group);
      const halo=new T.MeshStandardMaterial({color:info.color,emissive:info.color,emissiveIntensity:found.has(info.id)?.5:.05});
      mesh(group,new T.CylinderGeometry(.95,1.08,.22,48),stone,0,.11);
      mesh(group,new T.CylinderGeometry(.72,.86,.5,48),material(info.color),0,.43);
      const rim=mesh(group,new T.TorusGeometry(.9,.035,8,64),halo,0,.25);rim.rotation.x=Math.PI/2;
      const dust=new T.BufferGeometry();dust.setAttribute('position',new T.BufferAttribute(new Float32Array(16*3),3));
      const glints=new T.Points(dust,new T.PointsMaterial({map:sparkle,color:info.color,size:.12,transparent:true,opacity:.5,depthWrite:false}));glints.name='discovery-glints';glints.frustumCulled=false;group.add(glints);
      const item:Installation={info,group,parts:[],glints,halo,triggered:-100,energy:0,phase:0};
      const builders:Partial<Record<Discovery['kind'],()=>void>>={
        butterflies:()=>{
          // An open book with folded, two-wing paper butterflies.
          for(const side of [-1,1]){const page=box(group,stone,.65,.09,.85,side*.31,.91);page.rotation.z=side*.16;
            for(let line=0;line<5;line++)box(group,metal,.43,.012,.016,side*.33,.985,.28-line*.12);}
          const wing=new T.BufferGeometry();wing.setAttribute('position',new T.Float32BufferAttribute([0,0,0,.38,.2,0,.29,-.2,.08],3));wing.computeVertexNormals();
          for(let i=0;i<9;i++){
            const butterfly=new T.Group(),paper=new T.MeshStandardMaterial({color:pastel[i%5],side:T.DoubleSide,roughness:.8});
            butterfly.name='paper-butterfly';
            for(const side of [-1,1]){const pivot=new T.Group();const fold=mesh(pivot,wing,paper);fold.scale.x=side;butterfly.add(pivot);}
            mesh(butterfly,new T.CapsuleGeometry(.025,.22,3,6),metal);
            group.add(butterfly);item.parts.push(butterfly);
          }
        },
        bubbles:()=>{
          const nozzle=mesh(group,new T.TorusGeometry(.42,.075,12,48),metal,0,1.25);nozzle.rotation.x=-.45;
          for(const x of [-.5,.5])mesh(group,new T.CylinderGeometry(.04,.06,.65,12),metal,x,.95);
          const gauge=mesh(group,new T.CircleGeometry(.19,24),stone,0,1,.27);
          box(gauge,metal,.018,.22,.015,0,.05,.02).rotation.z=-.5;
          const geometry=new T.SphereGeometry(1,16,12),soap=new T.MeshPhysicalMaterial({color:'#c5e8f1',roughness:.12,metalness:.1,transparent:true,opacity:.48,depthWrite:false,clearcoat:1});
          for(let i=0;i<18;i++){const bubble=mesh(group,geometry,soap);bubble.castShadow=false;bubble.receiveShadow=false;item.parts.push(bubble);}
        },
        prism:()=>{
          const support=mesh(group,new T.CylinderGeometry(.07,.12,1.65,16),metal,0,1.2,-.45);support.name='pinwheel-support';
          const axle=mesh(group,new T.CylinderGeometry(.055,.055,.95,12),metal,0,2,0);axle.rotation.x=Math.PI/2;
          const rotor=new T.Group();rotor.name='pinwheel-rotor';rotor.position.set(0,2,.48);group.add(rotor);item.parts.push(rotor);
          mesh(rotor,new T.IcosahedronGeometry(.23,1),stone);
          for(let i=0;i<10;i++){
            const a=i*Math.PI/5,petal=mesh(rotor,new T.CapsuleGeometry(.13,.7,4,12),material(pastel[i%5],.35,.08),Math.cos(a)*.68,Math.sin(a)*.68);
            petal.rotation.z=a-Math.PI/2;petal.rotation.y=.35;
          }
          mesh(group,new T.TorusGeometry(1.22,.035,8,72),metal,0,2,.48);
        },
        chimes:()=>{
          for(const x of [-.72,.72])mesh(group,new T.CylinderGeometry(.045,.07,2.2,12),metal,x,1.55);
          const canopy=mesh(group,new T.TorusGeometry(.74,.055,10,48),stone,0,2.68);canopy.rotation.x=Math.PI/2;
          for(let i=0;i<5;i++){
            const chime=new T.Group();chime.position.set((i-2)*.28,2.65,0);group.add(chime);item.parts.push(chime);
            const h=.65+(i%3)*.18;
            mesh(chime,new T.CylinderGeometry(.009,.009,.25,6),metal,0,-.125);
            mesh(chime,new T.CylinderGeometry(.065,.065,h,16),material(pastel[i],.3,.25),0,-.25-h/2);
            mesh(chime,new T.SphereGeometry(.075,12,8),stone,0,-h-.3);
          }
          const striker=mesh(group,new T.SphereGeometry(.13,16,10),metal,0,1.17,.12);striker.scale.y=.7;
        },
        bloom:()=>{
          mesh(group,new T.CylinderGeometry(.05,.1,.55,12),metal,0,.95);
          mesh(group,new T.SphereGeometry(.2,16,12),halo,0,1.43);
          for(let i=0;i<7;i++){
            const pivot=new T.Group();pivot.rotation.y=i*Math.PI*2/7;pivot.position.y=1.2;group.add(pivot);
            const hinge=new T.Group();pivot.add(hinge);item.parts.push(hinge);
            const petal=mesh(hinge,new T.SphereGeometry(1,16,10),material(pastel[(i+1)%5],.5),0,.38,.18);petal.scale.set(.2,.5,.065);petal.rotation.x=.4;
          }
        },
        orrery:()=>{
          mesh(group,new T.ConeGeometry(.28,.7,16),metal,0,1);
          mesh(group,new T.IcosahedronGeometry(.23,1),halo,0,1.8);
          for(let i=0;i<3;i++){
            const pivot=new T.Group();pivot.position.y=1.8;pivot.rotation.set(.5+i*.6,0,i*.7);group.add(pivot);item.parts.push(pivot);
            const ring=mesh(pivot,new T.TorusGeometry(.58+i*.18,.022,8,48),metal);ring.rotation.x=Math.PI/2;
            mesh(pivot,new T.SphereGeometry(.09+i*.02,12,8),material(pastel[i]),.58+i*.18,0,0);
          }
        },
        leaves:()=>{
          const stem=new T.CatmullRomCurve3([new T.Vector3(0,.6,0),new T.Vector3(-.22,1.2,0),new T.Vector3(.2,2,0),new T.Vector3(0,2.55,0)]);
          mesh(group,new T.TubeGeometry(stem,24,.035,6,false),metal);
          const outline=new T.Shape();[[0,.42],[.11,.17],[.3,.25],[.23,.06],[.39,-.06],[.15,-.16],[.1,-.3],[0,-.23],[-.1,-.3],[-.15,-.16],[-.39,-.06],[-.23,.06],[-.3,.25],[-.11,.17]].forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));outline.closePath();
          const leafGeometry=new T.ExtrudeGeometry(outline,{depth:.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.007,bevelSegments:1});leafGeometry.rotateX(-Math.PI/2);
          for(let i=0;i<8;i++){
            const leaf=new T.Group();group.add(leaf);item.parts.push(leaf);
            mesh(leaf,leafGeometry,material(['#d7aa65','#c78e70','#e3bf83'][i%3]));
            box(leaf,metal,.009,.006,.48,0,.025,-.02);
          }
        },
        tides:()=>{
          mesh(group,new T.CylinderGeometry(.73,.64,.12,40),material('#88c6c7',.23,.15),0,.78);
          for(let i=0;i<4;i++){const ring=mesh(group,new T.TorusGeometry(1,.028,8,48),halo,0,.88);ring.rotation.x=Math.PI/2;item.parts.push(ring);}
          const pearl=mesh(group,new T.SphereGeometry(.2,20,14),material('#f8e5cd',.18,.25),0,1.05);pearl.name='tide-pearl';
        }
      };
      const build=builders[info.kind];if(build)build();else{const pocket=pocketWonder(info.kind,group,stone,metal,halo);if(pocket){item.parts=pocket.parts;item.animate=pocket.animate;}}
      for(const part of item.parts)part.userData.dynamic=true;
      const height=({butterflies:1,bubbles:1.75,prism:3.3,chimes:2.8,bloom:2,orrery:2.9,leaves:2.8,tides:1.4} as Record<string,number>)[info.kind]??2.8;
      this.releases.push(batchStatic(group));obstacles.push({x:info.x,z:info.z,radius:1.1*(info.scale??1),height:(info.y??0)+height*(info.scale??1)});this.items.push(item);
    }
  }
  candidate(x:number,z:number,heading?:{x:number;z:number}){let target:Installation|null=null,score=-Infinity;for(const item of this.items){const value=discoveryScore(x,z,item.info.x,item.info.z,2.8,heading);if(value>score){score=value;target=item;}}return {target,score};}
  clear(){if(this.nearby){this.nearby=null;this.bus.emit('wonderNearby',null);}}
  interact(){
    const item=this.nearby;if(!item||this.elapsed-item.triggered<1.6)return;
    item.triggered=this.elapsed;item.halo.emissiveIntensity=.6;this.bus.emit('discover',item.info);
    if(['chimes','cloudbell','vinyl'].includes(item.info.kind))this.bus.emit('melody',item.info.kind==='vinyl'?[392,493.88,587.33]:[523.25,587.33,659.25,783.99,880]);else this.bus.emit('sound','interaction');
  }
  update(dt:number,x:number,z:number,available:boolean,paused:boolean,heading?:{x:number;z:number}){
    const next=available?this.candidate(x,z,heading).target:null;if(next!==this.nearby){this.nearby=next;this.bus.emit('wonderNearby',next?.info??null);}
    if(!paused)this.elapsed+=dt;
    const time=this.reduced.matches?0:this.elapsed;
    for(const item of this.items){
      const age=this.elapsed-item.triggered;
      if(!paused&&!this.reduced.matches)advanceFlight(item,age,dt);
      const energy=this.reduced.matches?0:item.energy;
      item.animate?.(time,energy);
      const dust=item.glints.geometry.attributes.position as T.BufferAttribute;
      for(let i=0;i<dust.count;i++){const a=time*.25+i*2.4,r=.85+Math.sin(i*1.7)*.22;dust.setXYZ(i,Math.cos(a)*r,.7+(i/16*1.7+time*.12)%(1.7+energy*.6),Math.sin(a)*r);}dust.needsUpdate=true;
      (item.glints.material as T.PointsMaterial).opacity=.38+energy*.3;
      item.parts.forEach((part,i)=>{
        const a=time*.4+i*2.4;
        if(item.info.kind==='butterflies'){
          const radius=.25+energy*(.25+(i%3)*.13);
          part.position.set(Math.cos(a)*radius,1.35+(i%3)*.23+energy*(.95+Math.sin(time*.5+i)*.12),Math.sin(a)*radius);
          part.rotation.y=-a;part.children[0].rotation.y=Math.sin(this.reduced.matches?i:item.phase+i)*.65;part.children[1].rotation.y=-part.children[0].rotation.y;
          part.scale.setScalar(.22+energy*.23);
        }else if(item.info.kind==='bubbles'){
          const phase=(time*.16+i/18)%1;
          part.visible=i<3||energy>0;part.position.set(Math.sin(a)*(.15+phase*(.3+energy)),1.3+phase*(.75+energy*3.2),Math.cos(a)*(.15+phase*.65));
          part.scale.setScalar((.07+(i%4)*.035)*Math.sin(phase*Math.PI)*(.8+energy));
        }else if(item.info.kind==='prism'){
          if(!paused&&!this.reduced.matches)part.rotation.z+=dt*(.12+energy*3);
        }else if(item.info.kind==='chimes')part.rotation.z=Math.sin(time*(1.2+i*.16)+i)*(.025+energy*.38);
        else if(item.info.kind==='bloom')part.rotation.x=.12+energy*1.12+Math.sin(time*.6+i)*.035;
        else if(item.info.kind==='orrery'){if(!paused&&!this.reduced.matches)part.rotation.y+=dt*(.1+i*.035+energy*.75);}
        else if(item.info.kind==='leaves'){part.position.set(Math.cos(a)*(.4+energy*.2),.98+i*.18+Math.sin(time*.65+i)*(.03+energy*.2),Math.sin(a)*(.4+energy*.2));part.rotation.set(.15*Math.sin(a),-a,.2);}
        else if(item.info.kind==='tides'){const phase=(time*.13+i*.25)%1;part.scale.setScalar(.1+phase*(.52+energy*.28));part.position.y=.9+Math.sin(phase*Math.PI)*energy*.3;}
      });
    }
  }
  dispose(){this.releases.forEach(release=>release());}
}
