import {solveGrowth,solveOscillation} from '../../shared/research-physics.mjs';
self.onmessage=({data})=>{try{const result=data.kind==='bubble'?solveGrowth(data.parameters):solveOscillation(data.parameters);self.postMessage({id:data.id,result});}catch(error){self.postMessage({id:data.id,error:String(error)});}};
