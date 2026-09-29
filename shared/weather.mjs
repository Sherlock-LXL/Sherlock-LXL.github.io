export const weatherKinds=['sunny','cloudy','overcast','rain','snow'];
export const weatherNames={sunny:'晴天',cloudy:'多云',overcast:'阴天',rain:'雨天',snow:'雪天'};
const presets={sunny:{cover:.15,shade:0,rain:0,snow:0,wind:.45},cloudy:{cover:.55,shade:.22,rain:0,snow:0,wind:.65},overcast:{cover:.9,shade:.65,rain:0,snow:0,wind:.55},rain:{cover:1,shade:.85,rain:1,snow:0,wind:1},snow:{cover:.8,shade:.45,rain:0,snow:1,wind:.35}};
const smooth=t=>t*t*t*(t*(t*6-15)+10);
/** Continuous, interruption-safe weather. One journey holds each sky for 2–4 minutes. */
export class WeatherCycle{
  automatic=true;target='sunny';elapsed=0;hold=150;duration=12;from={...presets.sunny};value={...presets.sunny};transitioning=false;
  constructor(random=Math.random){this.random=random;}
  select(kind){if(!weatherKinds.includes(kind))throw new Error('Unknown weather');this.from={...this.value};this.target=kind;this.elapsed=0;this.transitioning=true;}
  update(dt,freeze=false){
    if(freeze||dt<=0)return this.value;
    if(this.transitioning){this.elapsed=Math.min(this.duration,this.elapsed+dt);const t=smooth(this.elapsed/this.duration);for(const key of Object.keys(this.value))this.value[key]=this.from[key]+(presets[this.target][key]-this.from[key])*t;if(this.elapsed===this.duration){this.transitioning=false;this.hold=120+this.random()*120;}}
    else if(this.automatic){this.hold-=dt;if(this.hold<=0){const candidates=weatherKinds.filter(k=>k!==this.target);this.select(candidates[Math.min(candidates.length-1,Math.floor(this.random()*candidates.length))]);}}
    return this.value;
  }
  get snapshot(){return {kind:this.target,automatic:this.automatic,transitioning:this.transitioning,progress:this.transitioning?this.elapsed/this.duration:1,...this.value};}
}
