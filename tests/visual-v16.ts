import * as T from 'three';
import {Weather} from '../src/world/weather';
import {Environment} from '../src/world/environment';
import {Discoveries} from '../src/world/discoveries';
import {EventBus} from '../src/core/events';
import {buildHarbor} from '../src/world/harbor';
import studio from '../modules/weiming/scene';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1200,850);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1200/850,.1,900);scene.background=new T.Color('#b7d4e1');scene.add(new T.HemisphereLight('#e7eff6','#b7c6ba',1.5));const sun=new T.DirectionalLight('#fff0dd',1.4);sun.position.set(-4,8,7);scene.add(sun);
const boat=buildHarbor(scene,[]).boat;
Object.assign(window,{
 async studioView(src:string,angle:number){
  const s=new T.Scene();s.background=new T.Color('#b7d4e1');s.add(new T.HemisphereLight('#e7eff6','#b7c6ba',1.5));const light=sun.clone();s.add(light);
  const exhibit=studio.create({module:{media:[{kind:'video',thumbnail:src}]} as any,region:{color:'#acd9c5'} as any});s.add(exhibit.root);
  const screen=exhibit.root.getObjectByName('studio-mv-inset') as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
  for(let i=0;i<100&&!screen.material.map?.image?.complete;i++)await new Promise(r=>setTimeout(r,20));
  camera.position.set(Math.sin(angle)*11,4.5,Math.cos(angle)*11);camera.lookAt(0,2.6,-1.5);renderer.render(s,camera);
  return {decoded:screen.material.map?.image?.naturalWidth>0,z:screen.position.z,width:screen.geometry.parameters.width,height:screen.geometry.parameters.height,placeholder:!!exhibit.root.getObjectByName('studio-play-placeholder')};
 },
 boatView(angle:number){camera.position.set(boat.position.x+Math.sin(angle)*6,-1.6,boat.position.z+Math.cos(angle)*7);camera.lookAt(boat.position.x,-4.3,boat.position.z);renderer.render(scene,camera);},
 weatherChecks(){
  const scene=new T.Scene(),env=new Environment(scene,[]);env.cycling=false;env.weather.cycle.automatic=false;camera.position.set(0,1.7,0);camera.lookAt(0,30,-60);
  env.hour=22;env.restoreTime(9,false);if(env.hour!==22)throw new Error('Photo exit snapped the hour');env.update(1/60);if(env.hour<21)throw new Error('Photo exit changed light too quickly');for(let i=0;i<300;i++)env.update(1/60);if(Math.abs(env.hour-9)>.02)throw new Error('Photo exit failed to restore time');
  const colors=[];for(const kind of ['overcast','rain','snow']){
   env.weather.cycle.select(kind);env.update(13);const a=scene.getObjectByName(kind==='snow'?'weather-snow':'weather-rain') as T.Points;
   const before=[...a.geometry.attributes.position.array];env.weather.update(0,false,new T.Vector3(10,8,20),.5);const unchanged=before.every((v,i)=>v===a.geometry.attributes.position.array[i]);
   let largest=0,previous:number[]|undefined;
   for(let hour=4;hour<=20;hour+=.005){env.hour=hour;env.update(0);const sky=(env as any).skyMaterial.uniforms;const values=[...sky.horizon.value.toArray(),...sky.zenith.value.toArray(),...((scene.getObjectByName('drifting-clouds') as T.InstancedMesh).material as T.MeshStandardMaterial).color.toArray(),env.light.intensity];if(previous)largest=Math.max(largest,...values.map((v,i)=>Math.abs(v-previous![i])));previous=values;}
   env.hour=10;env.update(.02);renderer.render(scene,camera);colors.push({kind,largest,unchanged});
  }
  return colors;
 },
 cloudView(){const sky=new T.Scene(),env=new Environment(sky,[]);env.cycling=false;env.weather.cycle.select('cloudy');env.update(13);camera.position.set(-24,1.7,-16);camera.lookAt(10,32,-80);renderer.render(sky,camera);},
 pinwheelCheck(){
  const s=new T.Scene(),bus=new EventBus();const d=new Discoveries(s,[{id:'prism',title:'',action:'',description:'',regionTitle:'',color:'#e3c385',position:[0,0],x:0,z:0,kind:'prism'}],[],bus,new Set());const rotor=s.getObjectByName('pinwheel-rotor')!;
  let minZ=Infinity,maxZ=-Infinity;d.update(0,0,0,true,false);d.interact();for(let i=0;i<720;i++){d.update(1/60,0,0,true,false);s.updateMatrixWorld(true);const b=new T.Box3().setFromObject(rotor);minZ=Math.min(minZ,b.min.z);maxZ=Math.max(maxZ,b.max.z);}return {minZ,maxZ};
 }
});

