/** Stable IDs keep saves valid when modules are reordered or temporarily removed. */
export function memoryEntries(catalog){return catalog.modules.flatMap(m=>{
  const r=catalog.regions.find(r=>r.id===m.region);if(!r)return [];
  return (m.world?.fragments??[]).map(f=>({...f,id:`${m.id}--${f.id}`,moduleId:m.id,regionId:r.id,regionTitle:r.title,color:r.color,x:r.position[0]+f.position[0],z:r.position[1]+f.position[1]}));
});}
export function starPosition(id,entries=[]){const i=Math.max(0,entries.findIndex(e=>e.id===id)),rows=Math.max(1,Math.ceil(entries.length/3)),row=Math.floor(i/3),column=row%2?2-i%3:i%3;return {x:35+column*65,y:rows===1?95:30+row*130/(rows-1)};}
export function growthEntries(entries){return entries.filter(e=>e.growth).sort((a,b)=>a.growth.order-b.growth.order||a.id.localeCompare(b.id));}
