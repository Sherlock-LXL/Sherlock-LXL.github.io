import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {renderSettings as quality} from './render-settings';

/** Reflect the actual world. Only nearby, visible mirrors need a second scene pass. */
export function worldMirror(width:number,height:number){
  const geometry=new T.PlaneGeometry(width,height);
  const mirror=new Reflector(geometry,{textureWidth:quality.mirrorWidth,textureHeight:quality.mirrorHeight,multisample:1,clipBias:.003});
  mirror.name='world-mirror';mirror.userData.dynamic=true;
  const shader=mirror.material as T.ShaderMaterial;
  shader.uniforms.reflectionStrength={value:1};
  shader.fragmentShader=shader.fragmentShader.replace('uniform vec3 color;','uniform vec3 color;\nuniform float reflectionStrength;')
    .replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( mix(vec3(0.17,0.24,0.25), base.rgb * vec3(0.93,0.95,0.95), reflectionStrength), 1.0 )');
  const reflect=mirror.onBeforeRender,position=new T.Vector3(),eye=new T.Vector3();
  mirror.onBeforeRender=function(renderer,scene,camera,...rest){
    const distance=this.getWorldPosition(position).distanceTo(camera.getWorldPosition(eye));
    shader.uniforms.reflectionStrength.value=1-T.MathUtils.smoothstep(distance,quality.mirrorFadeStart,quality.mirrorDistance);
    if(distance<quality.mirrorDistance)reflect.call(this,renderer,scene,camera,...rest);
  };
  geometry.addEventListener('dispose',()=>mirror.getRenderTarget().dispose());
  return mirror;
}
