import * as T from 'three';
export type Finish='plaster'|'stone'|'wood'|'metal'|'grass'|'paving'|'foliage'|'cliff'|'sand'|'snow';
const maps=new Map<Finish,T.CanvasTexture>();
/** Small deterministic material tiles. Shared maps retain static batching and mip filtering. */
export function surfaceMap(kind:Finish){
  const existing=maps.get(kind);if(existing)return existing;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;
  let seed=71423;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle={plaster:'#f5f3ee',stone:'#e9e6dc',wood:'#f3e8d5',metal:'#f2f3f1',grass:'#d6e0bd',paving:'#f2ebdc',foliage:'#f1f4e6',cliff:'#f0e5c9',sand:'#fff1d5',snow:'#fafcff'}[kind];c.fillRect(0,0,512,512);
  if(kind==='cliff')for(let i=0;i<32;i++){const y=i*16;c.strokeStyle='rgba(170,158,137,.035)';c.lineWidth=3;c.beginPath();for(let x=0;x<=512;x+=8){const v=y+Math.sin(x*Math.PI/256+i*.7)*3;if(x)c.lineTo(x,v);else c.moveTo(x,v);}c.stroke();}
  if(kind==='paving'){
    for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
      const x=col*128+(row%2)*64,y=row*64;c.fillStyle=`rgba(175,153,121,${.03+random()*.075})`;c.fillRect(x+2,y+2,124,60);
      c.strokeStyle='rgba(135,121,103,.26)';c.lineWidth=2;c.strokeRect(x+1,y+1,126,62);c.strokeStyle='rgba(255,255,246,.7)';c.beginPath();c.moveTo(x+3,y+60);c.lineTo(x+3,y+3);c.lineTo(x+124,y+3);c.stroke();
    }
  }
  if(kind==='wood'||kind==='metal')for(let i=0;i<190;i++){
    const y=random()*512;c.strokeStyle=`rgba(100,85,61,${kind==='metal'?.025:.035+random()*.05})`;c.lineWidth=.4+random();c.beginPath();
    for(let x=0;x<=512;x+=8){const v=y+(kind==='wood'?Math.sin(x*Math.PI/256+i)*2+Math.sin(x*Math.PI/128)*.6:0);if(x===0)c.moveTo(x,v);else c.lineTo(x,v);}c.stroke();
  }
  if(kind==='stone')for(let i=0;i<16;i++){
    const y=i*32;c.strokeStyle='rgba(127,119,101,.08)';c.lineWidth=2+random()*2;c.beginPath();for(let x=0;x<=512;x+=8){const v=y+Math.sin(x*Math.PI/256+i)*5;if(!x)c.moveTo(x,v);else c.lineTo(x,v);}c.stroke();
  }
  for(let i=0;i<11000;i++){
    const x=random()*512,y=random()*512;c.fillStyle=i%3===0?'rgba(105,117,91,.07)':'rgba(255,255,248,.17)';
    if(kind==='grass'){c.strokeStyle=i%3?'rgba(102,134,84,.2)':'rgba(255,252,202,.24)';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*3-1.5,y-2-random()*4);c.stroke();}
    else c.fillRect(x,y,.5+random()*1.5,.5+random()*1.5);
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;texture.minFilter=T.LinearMipmapLinearFilter;texture.name=`surface-${kind}`;maps.set(kind,texture);return texture;
}
export function surfaceMaterial(color:T.ColorRepresentation,roughness=.7,metalness=.05,finish:Finish=metalness>.2?'metal':'plaster'){
  const texture=surfaceMap(finish),detail=surfaceDetail(finish),relief=finish!=='foliage'&&finish!=='grass';
  const m=new T.MeshStandardMaterial({color,roughness,metalness,map:texture,roughnessMap:detail.roughness,normalMap:relief?detail.normal:null});
  m.normalScale.setScalar(finish==='plaster'?.2:finish==='metal'?.15:finish==='paving'?.6:.4);m.userData.finish=finish;
  // Metre-scale grain survives batching; large walls no longer stretch one small tile across a whole building.
  const reflections=metalness>.18||roughness<.4;
  m.onBeforeCompile=shader=>{if(!reflections)shader.fragmentShader='#undef USE_ENVMAP\n'+shader.fragmentShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 grainAxis=abs(normal);vec2 grainUv=grainAxis.y>max(grainAxis.x,grainAxis.z)?position.xz:grainAxis.x>grainAxis.z?position.zy:position.xy;
    grainUv/=2.0;
    #ifdef USE_MAP
      vMapUv=grainUv;
    #endif
    #ifdef USE_NORMALMAP
      vNormalMapUv=grainUv;
    #endif
    #ifdef USE_ROUGHNESSMAP
      vRoughnessMapUv=grainUv;
    #endif
  `);};m.customProgramCacheKey=()=>`surface-metric-v2-${finish}-${reflections}`;return m;
}

const details=new Map<Finish,{normal:T.DataTexture;roughness:T.DataTexture}>();
/** Shared, seam-wrapped micro-relief and roughness; no added polygons or per-frame work. */
export function surfaceDetail(kind:Finish){
 const known=details.get(kind);if(known)return known;
 const size=256,height=new Float32Array(size*size),rough=new Uint8Array(size*size*4),norm=new Uint8Array(size*size*4);
 let seed=61927;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,noise=random()-.5;
  let h=noise*.12;
  if(kind==='wood')h=Math.sin(v*Math.PI*80+Math.sin(u*Math.PI*2)*1.7)*.16+Math.sin(v*Math.PI*196)*.025+noise*.08;
  if(kind==='stone'||kind==='cliff')h=Math.sin(u*Math.PI*8)*Math.cos(v*Math.PI*6)*.14+Math.sin((u+v)*Math.PI*24)*.035+noise*.13;
  if(kind==='metal')h=Math.sin(v*Math.PI*240)*.06+noise*.015;
  if(kind==='paving'){const row=Math.floor(y/32),xx=(x+(row%2)*32)%64;h=(xx<1.5||y%32<1.5?-.45:.08)+noise*.05;}
  if(kind==='sand')h=Math.sin(v*Math.PI*10+Math.sin(u*Math.PI*4)*.7)*.11+noise*.1;
  if(kind==='snow')h=Math.sin(u*Math.PI*4)*Math.cos(v*Math.PI*6)*.05+noise*.025;
  height[y*size+x]=h;const k=(y*size+x)*4,r=Math.round(T.MathUtils.clamp(.88-h*.24+noise*.05,.55,1)*255);rough.set([r,r,r,255],k);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const at=(a:number,b:number)=>height[((b+size)%size)*size+(a+size)%size];
  const n=new T.Vector3((at(x-1,y)-at(x+1,y))*1.2,(at(x,y-1)-at(x,y+1))*1.2,1).normalize();norm.set([Math.round((n.x*.5+.5)*255),Math.round((n.y*.5+.5)*255),Math.round((n.z*.5+.5)*255),255],(y*size+x)*4);
 }
 const make=(data:Uint8Array)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;};
 const value={normal:make(norm),roughness:make(rough)};details.set(kind,value);return value;
}
