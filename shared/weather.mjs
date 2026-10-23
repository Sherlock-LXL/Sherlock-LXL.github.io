export const weatherKinds=['sunny','cloudy','overcast','rain','snow','tornado','hail','aurora','sunset'];
export const weatherNames={sunny:'晴天',cloudy:'多云',overcast:'阴天',rain:'雨天',snow:'雪天',tornado:'远海龙卷',hail:'冰雹',aurora:'极光',sunset:'霞光'};
const base={cover:.15,shade:0,rain:0,snow:0,wind:.45,tornado:0,hail:0,aurora:0,sunset:0};
const presets={
  sunny:{...base},cloudy:{...base,cover:.55,shade:.22,wind:.65},overcast:{...base,cover:.9,shade:.65,wind:.55},
  rain:{...base,cover:1,shade:.85,rain:1,wind:1},snow:{...base,cover:.8,shade:.45,snow:1,wind:.35},
  tornado:{...base,cover:.68,shade:.3,wind:1,tornado:1},hail:{...base,cover:.86,shade:.48,wind:.8,hail:1},
  aurora:{...base,cover:.08,wind:.25,aurora:1},sunset:{...base,cover:.28,wind:.3,sunset:1},
};
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
