import * as T from 'three';
import {World} from '../src/world/world';
import {EventBus} from '../src/core/events';
import {terminal} from '../src/world/scenery';
let world:any;
Object.assign(window,{
 async initV20(catalog:any){
  const host=document.createElement('div');host.style.cssText='position:absolute;left:-5000px;width:1200px;height:850px';document.body.append(host);
  world=new World(host,catalog,new EventBus());await new Promise(r=>setTimeout(r,600));cancelAnimationFrame(world.frame);world.observer.disconnect();
  document.body.append(world.renderer.domElement);world.renderer.setPixelRatio(1);world.renderer.setSize(1200,850);world.camera.aspect=1200/850;world.camera.fov=52;world.camera.updateProjectionMatrix();
  world.environment.cycling=false;world.environment.hour=10;world.environment.weather.cycle.automatic=false;world.environment.update(0);
  const t=terminal('02 镜子房间','#d5a9bd','卷积神经网络');t.updateMatrixWorld(true);
  const post=new T.Box3().setFromObject(t.getObjectByName('terminal-post')!),plate=new T.Box3().setFromObject(t.getObjectByName('solid-sign')!);
  return {state:(window as any).__xiangmetaInspect(),postTop:post.max.y,plateBottom:plate.min.y};
 },
 viewV20(position:number[],target:number[]){world.camera.position.set(...position);world.camera.lookAt(...target);world.scene.updateMatrixWorld(true);world.renderer.shadowMap.needsUpdate=true;world.renderer.render(world.scene,world.camera);},
 mirrorV20(side:number,distance=7){
  const mirror=world.scene.getObjectByName('world-mirror'),center=mirror.getWorldPosition(new T.Vector3()),camera=mirror.localToWorld(new T.Vector3(side,0,distance));
  world.camera.position.copy(camera);world.camera.lookAt(center);world.scene.updateMatrixWorld(true);world.renderer.render(world.scene,world.camera);
  const virtual=mirror.worldToLocal(mirror.camera.position.clone());
  return {virtual:virtual.toArray(),strength:mirror.material.uniforms.reflectionStrength.value,center:center.toArray()};
 }
});
