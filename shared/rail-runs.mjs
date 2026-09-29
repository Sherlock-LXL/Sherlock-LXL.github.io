/** Openings split a railing into runs. A run needs two full bays, never a lone post.
 * @template {{x:number,y:number,z:number}} T
 * @param {(T|null)[]} samples
 * @param {(a:T,b:T)=>boolean} [clearBay]
 * @returns {T[][]}
 */
export function railRuns(samples,clearBay=()=>true){
 const runs=[];let run=[];
 const flush=()=>{if(run.length>=3)runs.push(run);run=[];};
 for(const p of samples){if(!p){flush();continue;}const last=run.at(-1);
  if(last&&(Math.hypot(last.x-p.x,last.y-p.y,last.z-p.z)>=2.8||!clearBay(last,p)))flush();
  run.push(p);
 }
 flush();return runs;
}
