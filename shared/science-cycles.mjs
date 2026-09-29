/** Illustrative slow-motion cycles, not measured radius or physical simulation. */
export function risingBubble(time,index=0){
  const phase=((time+index*1.37)%9+9)%9;
  if(phase<1.8)return {y:.68,radius:.015+.115*phase/1.8,ripple:0,visible:true};
  if(phase<7.5){const t=(phase-1.8)/5.7;return {y:.68+t*3.15,radius:.13+t*.055,ripple:0,visible:true};}
  return {y:3.83,radius:0,ripple:(phase-7.5)/1.5,visible:false};
}
export function confinedBubble(time){
  const phase=((time%6)+6)%6;
  if(phase<4.9)return {radius:.13+.43*phase/4.9,flash:0,phase:'growth'};
  if(phase<5.16){const t=(phase-4.9)/.26;return {radius:.56-(.56-.045)*t*t,flash:0,phase:'collapse'};}
  if(phase<5.3)return {radius:.045,flash:Math.sin((phase-5.16)/.14*Math.PI),phase:'flash'};
  return {radius:.045+.085*(phase-5.3)/.7,flash:0,phase:'recovery'};
}
