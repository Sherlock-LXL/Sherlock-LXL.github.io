import {worldWhisper} from '../../shared/world-whispers.mjs';
import type {EventBus} from '../core/events';

/** One quiet, non-repeating line per visited region when the player pauses to look. */
export class WorldWhispers{
  private region='';private dwell=0;private still=0;private heard=new Set<string>();
  constructor(private bus:EventBus){}
  get snapshot(){return {region:this.region,dwell:this.dwell,still:this.still,heard:[...this.heard]};}
  update(dt:number,region:string,moving:boolean,busy:boolean,hour:number,resonanceComplete=false){
    if(region!==this.region){this.region=region;this.dwell=0;this.still=0;}
    if(busy||!region)return;
    this.dwell+=dt;this.still=moving?Math.max(0,this.still-dt*2):this.still+dt;
    if(this.dwell<5.5||this.still<2.2||this.heard.has(region))return;
    this.heard.add(region);this.bus.emit('whisper',worldWhisper(region,hour,resonanceComplete));
  }
}
