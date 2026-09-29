import * as T from 'three';

/** A separate free camera. Player state and the walking camera are never edited. */
export class PhotoCamera {
  active=false;camera=new T.PerspectiveCamera(60,1,.08,900);
  private keys=new Set<string>();private dragging=false;private lastX=0;private lastY=0;private yaw=0;private pitch=0;private events=new AbortController();
  constructor(canvas:HTMLCanvasElement){
    const options={signal:this.events.signal};
    canvas.addEventListener('pointerdown',e=>{if(!this.active||e.button!==0)return;this.dragging=true;this.lastX=e.clientX;this.lastY=e.clientY;canvas.focus();},options);
    window.addEventListener('pointerup',()=>this.dragging=false,options);
    window.addEventListener('pointermove',e=>{if(!this.active||!this.dragging)return;this.yaw-=(e.clientX-this.lastX)*.0023;this.pitch=T.MathUtils.clamp(this.pitch-(e.clientY-this.lastY)*.0023,-1.4,1.4);this.lastX=e.clientX;this.lastY=e.clientY;},options);
    window.addEventListener('keydown',e=>{if(!this.active||(e.target instanceof Element&&e.target.closest('input,select,textarea,dialog')))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}},options);
    window.addEventListener('keyup',e=>this.keys.delete(e.code),options);
    window.addEventListener('blur',()=>{this.keys.clear();this.dragging=false;},options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.dragging=false;}},options);
  }
  enter(source:T.PerspectiveCamera){this.active=true;this.keys.clear();this.camera.copy(source);this.camera.rotation.reorder('YXZ');this.yaw=this.camera.rotation.y;this.pitch=this.camera.rotation.x;this.camera.fov=60;this.camera.updateProjectionMatrix();}
  exit(){this.active=false;this.keys.clear();this.dragging=false;}
  fov(value:number){this.camera.fov=T.MathUtils.clamp(value,30,90);this.camera.updateProjectionMatrix();}
  resize(w:number,h:number){this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  update(dt:number){
    if(!this.active)return;
    const f=Number(this.keys.has('KeyW'))-Number(this.keys.has('KeyS')),s=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')),v=Number(this.keys.has('KeyE'))-Number(this.keys.has('KeyQ'));
    const direction=new T.Vector3(-Math.sin(this.yaw)*f+Math.cos(this.yaw)*s,v,-Math.cos(this.yaw)*f-Math.sin(this.yaw)*s).normalize().multiplyScalar(dt*8);
    this.camera.position.add(direction);this.camera.position.y=T.MathUtils.clamp(this.camera.position.y,-4.5,100);this.camera.position.x=T.MathUtils.clamp(this.camera.position.x,-180,180);this.camera.position.z=T.MathUtils.clamp(this.camera.position.z,-180,180);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
  }
  dispose(){this.events.abort();}
}

export async function exportPostcard(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera,place:string,hour:number,postcard:boolean){
  renderer.render(scene,camera);
  const source=renderer.domElement,w=Math.min(source.width,2048),h=Math.round(w*source.height/source.width),border=postcard?24:0,footer=postcard?100:0;
  const output=document.createElement('canvas');output.width=w+border*2;output.height=h+border*2+footer;
  const ctx=output.getContext('2d')!;ctx.fillStyle='#f4eee1';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(source,border,border,w,h);
  if(postcard){ctx.fillStyle='#385c56';ctx.font='500 27px "Segoe UI", "Microsoft YaHei", sans-serif';ctx.fillText('XiangMeta',border+12,h+border+47);ctx.font='14px "Segoe UI", "Microsoft YaHei", sans-serif';ctx.fillText('A WORLD STILL GROWING',border+12,h+border+75);ctx.textAlign='right';ctx.font='18px "Microsoft YaHei", sans-serif';ctx.fillText(place,output.width-border-12,h+border+46,w*.48);ctx.font='14px "Segoe UI", sans-serif';ctx.fillText(`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(hour%1*60)).padStart(2,'0')} · ISLAND TIME`,output.width-border-12,h+border+74);}
  const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error('图片导出失败')),'image/png'));
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`XiangMeta-${postcard?'Postcard':'Photo'}-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
