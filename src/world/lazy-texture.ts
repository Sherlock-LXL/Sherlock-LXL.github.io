import {Texture,ImageLoader,SRGBColorSpace} from 'three';
const waiting=new Map<string,Set<()=>void>>();
const active=new Set<string>();
const previews=new Map<string,string>();
const images=new Map<string,Promise<HTMLImageElement>>();
const pending:Promise<void>[]=[];
const textures=new Set<Texture>();
export function configurePreviews(entries:{src:string;preview:string}[]=[]){
  waiting.clear();active.clear();previews.clear();images.clear();pending.length=0;textures.clear();
  entries.forEach(({src,preview})=>previews.set(src,preview));
}
function image(src:string){
  if(!images.has(src))images.set(src,new Promise<HTMLImageElement>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`Image timeout: ${src}`)),15000);
    new ImageLoader().load(src,loaded=>{clearTimeout(timer);resolve(loaded);},undefined,error=>{clearTimeout(timer);reject(error);});
  }));
  return images.get(src)!;
}
export async function readyPreviews(progress:(done:number,total:number)=>void){
  let done=0;const total=pending.length;progress(0,total);
  await Promise.all(pending.map(p=>p.finally(()=>progress(++done,total))));
}
export function textureStatus(){
  return [...textures].map(t=>({src:t.name,ready:!!t.image,width:t.image?.width??0,detail:!!t.userData.detail}));
}
/** Real 384px artwork is present at entry; region arrival upgrades its existing texture. */
export function regionTexture(src:string,region:string){
  const texture=new Texture();texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;
  texture.name=src;textures.add(texture);
  let disposed=false,detail=false,started=false;
  const assign=(loaded:HTMLImageElement,full:boolean)=>{
    if(disposed||(!full&&detail))return;
    texture.image=loaded;texture.needsUpdate=true;detail=full;texture.userData.detail=full;
  };
  const preview=previews.get(src)??src;
  pending.push(image(preview).catch(()=>image(src)).then(loaded=>assign(loaded,preview===src))
    .catch(()=>console.warn(`Artwork preview unavailable: ${src}`)));
  const load=()=>{
    waiting.get(region)?.delete(load);
    if(disposed||started)return;started=true;
    void image(src).then(loaded=>assign(loaded,true)).catch(()=>console.warn(`Keeping artwork preview: ${src}`));
  };
  texture.addEventListener('dispose',()=>{disposed=true;textures.delete(texture);waiting.get(region)?.delete(load);});
  if(active.has(region))load();
  else{if(!waiting.has(region))waiting.set(region,new Set());waiting.get(region)!.add(load);}
  return texture;
}
export function loadRegionTextures(region?:string){
  const regions=region?[region]:[...waiting.keys()];
  for(const id of regions){active.add(id);for(const load of waiting.get(id)??[])load();waiting.delete(id);}
}
