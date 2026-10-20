import * as T from 'three';import {World} from '../src/world/world';import {EventBus} from '../src/core/events';import {researchCamp} from '../src/world/research-camp';
let world:any;const found=new Set<string>();let collected=0;
Object.assign(window,{
 async initV22(catalog:any){
  const host=document.createElement('div');host.style.cssText='position:absolute;left:-5000px;width:1200px;height:850px';document.body.append(host);const bus=new EventBus();bus.on('memory',()=>collected++);
  world=new World(host,catalog,bus,new Set(),found);await new Promise(r=>setTimeout(r,600));cancelAnimationFrame(world.frame);world.observer.disconnect();
  document.body.append(world.renderer.domElement);world.renderer.setPixelRatio(1);world.renderer.setSize(1200,850);world.camera.aspect=1200/850;world.camera.fov=52;world.camera.updateProjectionMatrix();
  world.environment.cycling=false;world.environment.hour=10;world.environment.weather.cycle.automatic=false;world.environment.update(0);
  const camp=researchCamp();camp.updateMatrixWorld(true);const roofs=camp.children.filter(r=>r.name.startsWith('research-lab-')).map(r=>{const apparatus=r.children.find(o=>o.name.startsWith('research-apparatus-'))!;return {name:r.name,x:r.position.x,base:apparatus.position.y,bottom:new T.Box3().setFromObject(apparatus).min.y};});
  return {roofs,state:(window as any).__xiangmetaInspect()};
 },
 viewV22(position:number[],target:number[]){world.camera.position.set(...position);world.camera.lookAt(...target);world.scene.updateMatrixWorld(true);world.renderer.shadowMap.needsUpdate=true;world.renderer.render(world.scene,world.camera);},
 memoryV22(collect:boolean){
  const entry=world.memories.entries[0];if(collect)found.add(entry.id);
  world.memories.update(1,entry.x,entry.z,true,false);world.memories.interact();
  const star=world.memories.stars.get(entry.id).ground,c=star.material.color;
  return {point:[star.position.x,star.position.y,star.position.z],energy:star.userData.energy,brightness:c.r*.2126+c.g*.7152+c.b*.0722,halo:star.getObjectByName('memory-soft-halo').material.opacity,collected};
 }
});
