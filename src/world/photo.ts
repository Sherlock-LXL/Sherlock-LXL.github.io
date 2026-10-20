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

/** `draw` renders the painted frame into `source`; the export reads it within the same task. */
export async function exportPostcard(source:HTMLCanvasElement,draw:()=>void,place:string,hour:number,postcard:boolean){
  draw();
  const w=Math.min(source.width,2048),h=Math.round(w*source.height/source.width),border=postcard?28:0,footer=postcard?112:0;
  const output=document.createElement('canvas');output.width=w+border*2;output.height=h+border*2+footer;
  const ctx=output.getContext('2d')!;ctx.fillStyle='#efe6d2';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(source,border,border,w,h);
  if(postcard){
    const serif='"Songti SC","STSong","Noto Serif SC","Source Han Serif SC","SimSun",serif',baseline=h+border;
    ctx.strokeStyle='#2b282455';ctx.lineWidth=1;ctx.strokeRect(border-6.5,border-6.5,w+13,h+13);
    // A cinnabar seal carries the owner's character, as on every leaf of an album.
    const seal=54,sx=border+8,sy=baseline+30;ctx.fillStyle='#b8432f';ctx.fillRect(sx,sy,seal,seal);ctx.strokeStyle='#f6efe2';ctx.lineWidth=2;ctx.strokeRect(sx+4,sy+4,seal-8,seal-8);
    ctx.fillStyle='#f6efe2';ctx.font=`600 34px ${serif}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('湘',sx+seal/2,sy+seal/2+1);
    ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#2b2824';ctx.font=`600 26px ${serif}`;ctx.fillText('XiangMeta · 山海册页',sx+seal+18,baseline+56);
    ctx.fillStyle='#6b6255';ctx.font='13px "Segoe UI", "PingFang SC", sans-serif';ctx.fillText('A PERSONAL ALBUM OF MOUNTAINS AND SEAS',sx+seal+18,baseline+80);
    ctx.textAlign='right';ctx.fillStyle='#2b2824';ctx.font=`20px ${serif}`;ctx.fillText(place,output.width-border-10,baseline+56,w*.46);
    ctx.fillStyle='#6b6255';ctx.font='13px "Segoe UI", sans-serif';ctx.fillText(`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(hour%1*60)).padStart(2,'0')} · ISLAND TIME`,output.width-border-10,baseline+80);
  }
  const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error('图片导出失败')),'image/png'));
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`XiangMeta-${postcard?'Postcard':'Photo'}-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
