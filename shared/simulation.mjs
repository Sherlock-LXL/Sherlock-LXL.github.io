// Educational normalized animation curves only; no empirical or physical claims.
export function sampleSimulation(kind,parameter,count=90) {
  const p=Math.max(0,Math.min(1,parameter));
  return Array.from({length:count},(_,i)=>{
    const t=i/(count-1);
    return kind==='bubble'?0.15+0.7*Math.pow((t*(2+p*2))%1,0.65):0.5+(0.1+p*0.3)*Math.sin(t*Math.PI*12);
  });
}
