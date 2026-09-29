import type { EventBus } from '../core/events';
export class LookControls {
  yaw=0;pitch=0;
  private events=new AbortController();private dragging=false;private lastX=0;private lastY=0;private travel=0;private resetSample=false;
  private lockEnabled=matchMedia('(pointer: fine)').matches;
  constructor(private canvas:HTMLCanvasElement,private allowed:()=>boolean,private bus:EventBus){
    const options={signal:this.events.signal};
    canvas.addEventListener('pointerdown',e=>{if(!this.allowed()||e.button!==0)return;canvas.focus();this.dragging=true;this.travel=0;this.lastX=e.clientX;this.lastY=e.clientY;if(e.pointerType!=='mouse')try{canvas.setPointerCapture(e.pointerId);}catch{}},options);
    window.addEventListener('pointerup',()=>this.dragging=false,options);
    window.addEventListener('pointercancel',()=>this.dragging=false,options);
    window.addEventListener('blur',()=>this.release(),options);
    window.addEventListener('pointermove',e=>{
      if(!this.allowed())return;const locked=document.pointerLockElement===canvas;if(!locked&&!this.dragging)return;
      const dx=locked?e.movementX:e.clientX-this.lastX,dy=locked?e.movementY:e.clientY-this.lastY;
      this.lastX=e.clientX;this.lastY=e.clientY;this.travel+=Math.abs(dx)+Math.abs(dy);
      // Browser recentering can emit a stale absolute delta at lock transitions.
      if(this.resetSample){this.resetSample=false;return;}
      if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>400||Math.abs(dy)>400)return;
      this.yaw-=dx*.0023;this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch-dy*.0023));
    },options);
    canvas.addEventListener('click',()=>{if(this.travel<5)this.capture();},options);
    document.addEventListener('pointerlockchange',()=>{
      this.resetSample=true;this.dragging=false;
      if(document.pointerLockElement===canvas&&!this.allowed()){document.exitPointerLock();return;}
      this.bus.emit('look',document.pointerLockElement===canvas);
    },options);
    document.addEventListener('pointerlockerror',()=>this.bus.emit('look',false),options);
  }
  capture(){if(!this.lockEnabled||!this.allowed()||document.pointerLockElement===this.canvas)return;try{const request=this.canvas.requestPointerLock();request?.catch(()=>this.bus.emit('look',false));}catch{this.bus.emit('look',false);}}
  release(){this.dragging=false;if(document.pointerLockElement===this.canvas)document.exitPointerLock();}
  dispose(){this.release();this.events.abort();}
}
