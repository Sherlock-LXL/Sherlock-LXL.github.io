/** Existing horizon scenery remains separate from the four walkable islands. */
export const distantIslands=[
  {name:'future-quant-exchange',x:-116,z:55,rx:21,rz:16},
  {name:'future-robot-island',x:155,z:76,rx:20,rz:16},
  {name:'future-ai-institute',x:100,z:-90,rx:23,rz:18},
];
export const distantGround=-3.79;
export function distantContains(x,z,island,padding=0){
  return ((x-island.x)/(island.rx+padding))**2+((z-island.z)/(island.rz+padding))**2<1;
}
