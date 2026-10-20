import * as T from 'three';
import {buildExhibit} from '../src/world/architecture';
import {catSculpture} from '../src/world/cat-sculpture';
import {exchangeIsland,robotDistrict,researchInstitute} from '../src/world/future-landmarks';
import bubble from '../modules/bubble-lab/scene';import light from '../modules/sonoluminescence/scene';import studio from '../modules/weiming/scene';import photos from '../modules/photography/scene';import music from '../modules/personal-music/scene';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1100,850);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const camera=new T.PerspectiveCamera(40,1100/850,.1,1000);let current:any;
Object.assign(window,{async auditView(id:string,angle:number,catalog:any){
 current?.dispose?.();current=undefined;const scene=new T.Scene();scene.background=new T.Color('#c5d9df');scene.add(new T.HemisphereLight('#fff9ee','#a5bdb6',1.8));const sun=new T.DirectionalLight('#fff4db',2);sun.position.set(-15,25,20);scene.add(sun);
 const landmarks:Record<string,()=>T.Group>={exchange:exchangeIsland,robot:robotDistrict,institute:researchInstitute,cat:catSculpture};
 const factories:Record<string,any>={'bubble-lab':bubble,sonoluminescence:light,weiming:studio,photography:photos,'personal-music':music};
 let root:T.Group;if(landmarks[id])root=landmarks[id]();else{const m=catalog.modules.find((m:any)=>m.id===id),region=catalog.regions.find((r:any)=>r.id===m.region);current=factories[id]?.create({module:m,region});root=current?.root??buildExhibit(m.visual,region.color);}
 scene.add(root);for(let i=0;i<120;i++)current?.update?.(1/60);
 for(let i=0;i<80;i++){let pending=false;root.traverse(o=>{if(o instanceof T.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];pending||=mats.some((m:any)=>m.map&&(!m.map.image||m.map.image instanceof HTMLImageElement&&!m.map.image.complete));}});if(!pending)break;await new Promise(r=>setTimeout(r,40));}
 root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root),centre=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),radius=Math.max(size.x,size.y,size.z)*1.75;
 camera.position.copy(centre).add(new T.Vector3(Math.sin(angle)*radius,radius*.43,Math.cos(angle)*radius));camera.lookAt(centre);renderer.render(scene,camera);
 const invalid:string[]=[];root.traverse(o=>{if(o instanceof T.Mesh){const pos=o.geometry.attributes.position;if(pos&&!Array.from(pos.array).every(Number.isFinite))invalid.push(o.name);}});
 return {invalid,paws:root.getObjectsByProperty('name','cat-paw-left').length+root.getObjectsByProperty('name','cat-paw-right').length,bounds:[...b.min.toArray(),...b.max.toArray()],calls:renderer.info.render.calls};
}});
