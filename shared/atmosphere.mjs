const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** A full orbit: sunrise at 06:00, sunset at 18:00, moon exactly opposite. */
export function daylight(hour){
  const angle=(hour-6)/24*Math.PI*2,altitude=Math.sin(angle);
  return {angle,altitude,day:smooth(-.16,.32,altitude),twilight:1-smooth(0,.4,Math.abs(altitude)),sun:smooth(-.04,.3,altitude),moon:smooth(-.04,.3,-altitude)};
}
/** Continuous envelope; retriggering changes only the target, never the current pose. */
export function advanceFlight(state,age,dt){
  const target=1-smooth(4.5,8,age);
  state.energy+=(target-state.energy)*(1-Math.exp(-Math.max(0,dt)*2.4));
  state.phase+=Math.max(0,dt)*(3+state.energy*7);
  return state;
}
