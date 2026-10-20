import * as T from 'three';
import {World} from '../src/world/world';
import {EventBus} from '../src/core/events';
let world:any;
Object.assign(window,{
 async auditInit(catalog:any){
  const host=document.createElement('div');host.style.cssText='position:absolute;left:-5000px;width:1200px;height:850px';document.body.append(host);
  world=new World(host,catalog,new EventBus());await new Promise(r=>setTimeout(r,600));cancelAnimationFrame(world.frame);world.observer.disconnect();
  document.body.append(world.renderer.domElement);world.renderer.setSize(1200,850);world.renderer.setPixelRatio(1);world.camera.aspect=1200/850;world.camera.fov=52;world.camera.updateProjectionMatrix();
  world.environment.cycling=false;world.environment.hour=10;world.environment.weather.cycle.automatic=false;world.environment.update(0);
  return (window as any).__xiangmetaInspect();
 },
 auditView(position:number[],target:number[],weather='sunny',time=0){
  world.environment.weather.cycle.select(weather);world.environment.update(13);world.environment.weather.update(time,false,new T.Vector3(...position),1);
  world.camera.position.set(...position);world.camera.lookAt(...target);world.scene.updateMatrixWorld(true);world.renderer.shadowMap.needsUpdate=true;world.renderer.render(world.scene,world.camera);
 },
 rainAudit(){
  const rain=world.scene.getObjectByName('weather-rain'),g=rain.geometry;
  const before=[...g.attributes.position.array],speed=g.attributes.fallSpeed,tip=g.attributes.rainTip;
  let maxLength=0;for(let i=0;i<speed.count;i+=2){if(speed.getX(i)!==speed.getX(i+1))throw new Error('rain endpoints have different fall speeds');maxLength=Math.max(maxLength,tip.getX(i+1));}
  const motion=world.environment.weather.motionTime;world.environment.weather.update(1,true,new T.Vector3(19,4,-11),1);
  return {cameraIndependent:before.every((v,i)=>v===g.attributes.position.array[i]),frozen:motion===world.environment.weather.motionTime,maxLength};
 }
});
