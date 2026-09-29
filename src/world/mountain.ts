import * as T from 'three';
import {regionHeight,groundHeight} from '../../shared/terrain-height.mjs';
import {material,mesh,tree} from './architecture';
import {surfaceMap,surfaceMaterial} from './surfaces';
import {closestRoute,mountainRoutes,landings} from '../../shared/mountain-route.mjs';
import {seasonalColors} from './season-style';
import {sign,type Obstacle} from './scenery';
import type {Region,Exhibit} from '../core/types';

export function mountainSurface(region:Region){
  const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[],rings=180,sectors=256;
  const low=new T.Color(region.season?seasonalColors[region.season].ground:'#a7cfa7').lerp(new T.Color('#7eaa8c'),.18),high=new T.Color('#c7d6b1');
  for(let ring=0;ring<=rings;ring++)for(let j=0;j<=sectors;j++){
    const a=j/sectors*Math.PI*2,r=ring/rings*region.radius,x=Math.cos(a)*r,z=Math.sin(a)*r,y=regionHeight(x,z,region);
    positions.push(x,y,z);uvs.push(x/2.5,z/2.5);const c=low.clone().lerp(high,y/18);c.multiplyScalar(1+Math.sin(y*2.2)*.018);colors.push(c.r,c.g,c.b);
    if(ring<rings&&j<sectors){const a=ring*(sectors+1)+j,b=a+sectors+1;indices.push(a,a+1,b,b,a+1,b+1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const grass=surfaceMaterial('#ffffff',1,0,'grass');grass.vertexColors=true;const rock=surfaceMap('cliff');
  // Paint roads and landings into the terrain itself. Separate elevated road/disc
  // meshes used to intersect each other and leave visible sheets above the hillside.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  const ctx=canvas.getContext('2d')!,scale=canvas.width/(region.radius*2);
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(scale,-scale);ctx.lineCap=ctx.lineJoin='round';
  for(const route of mountainRoutes(region)){
    ctx.strokeStyle=route.kind==='main'?'#ff0000':'#00ff00';ctx.lineWidth=route.width;
    ctx.beginPath();route.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.z):ctx.moveTo(p.x,p.z));ctx.stroke();
  }
  ctx.fillStyle='#ff0000';for(const p of landings(region)){ctx.beginPath();ctx.arc(p.x,p.z,p.radius,0,Math.PI*2);ctx.fill();}
  const roadMask=new T.CanvasTexture(canvas);roadMask.anisotropy=4;
  grass.addEventListener('dispose',()=>roadMask.dispose());
  const color=geometry.attributes.color,normal=geometry.attributes.normal;for(let i=0;i<color.count;i++){const t=T.MathUtils.clamp((1-normal.getY(i)-.1)*3,0,1),c=new T.Color().fromBufferAttribute(color,i).lerp(new T.Color('#c5c0a6'),t);color.setXYZ(i,c.r,c.g,c.b);}
  grass.onBeforeCompile=shader=>{
    shader.fragmentShader='#undef USE_ENVMAP\n'+shader.fragmentShader;
    shader.uniforms.rockTexture={value:rock};
    shader.uniforms.roadMask={value:roadMask};shader.uniforms.roadTexture={value:surfaceMap('paving')};shader.uniforms.terrainRadius={value:region.radius};
    shader.vertexShader='varying vec3 terrainPosition;varying vec3 terrainNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPosition=position;terrainNormal=normal;');
    shader.fragmentShader='uniform sampler2D rockTexture;uniform sampler2D roadMask;uniform sampler2D roadTexture;uniform float terrainRadius;varying vec3 terrainPosition;varying vec3 terrainNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 weights=pow(abs(normalize(terrainNormal)),vec3(4.0));
      weights/=max(weights.x+weights.y+weights.z,0.0001);
      vec3 rockColor=texture2D(rockTexture,terrainPosition.zy/2.5).rgb*weights.x
        +texture2D(rockTexture,terrainPosition.xy/2.5).rgb*weights.z
        +texture2D(rockTexture,terrainPosition.xz/2.5).rgb*weights.y;
      diffuseColor.rgb*=mix(texture2D(map,vMapUv).rgb,rockColor,smoothstep(0.12,0.38,1.0-abs(normalize(terrainNormal).y)));
      float cliff=smoothstep(0.12,0.4,1.0-abs(normalize(terrainNormal).y));
      float strata=sin(terrainPosition.y*3.1+sin(terrainPosition.x*.45)*.3+sin(terrainPosition.z*.38)*.3);
      diffuseColor.rgb*=1.0-cliff*(.04+.035*strata);
      vec2 road=texture2D(roadMask,terrainPosition.xz/(terrainRadius*2.0)+0.5).rg;
      float coverage=clamp(road.r+road.g,0.0,1.0)*smoothstep(0.65,0.93,normalize(terrainNormal).y);
      vec3 roadTint=mix(vec3(0.83,0.76,0.62),vec3(0.56,0.67,0.70),road.g/max(coverage,0.001));
      diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(roadTexture,terrainPosition.xz/4.0).rgb*roadTint,coverage);
    `);
  };grass.customProgramCacheKey=()=> 'garden-cliffs-roads-v5';
  // The cliff uses projected colour detail; a flat UV bump would stretch on vertical faces.
  grass.bumpMap=null;
  const surface=new T.Mesh(geometry,grass);surface.position.set(...[region.position[0],0,region.position[1]] as [number,number,number]);surface.receiveShadow=true;surface.name='mountain-surface';return surface;
}

/** Height-following ribbon, sampled densely enough to follow terrace transitions. */
export function hillsidePath(points:{x:number;z:number}[],regions:Region[],color:string,width=1.3){
  const positions:number[]=[],indices:number[]=[],uv:number[]=[],vertices=new Map<string,number>();
  // Clip a single tessellated surface to the road's distance field. A ribbon folds over
  // itself on hairpins and bridges over convex landings; this mesh does neither.
  const route={points:points.map(p=>({...p,y:0}))},step=.22;
  type Sample={x:number;z:number;d:number};
  const vertex=(p:Sample)=>{const key=`${p.x.toFixed(6)},${p.z.toFixed(6)}`;let id=vertices.get(key);if(id!==undefined)return id;id=positions.length/3;vertices.set(key,id);positions.push(p.x,groundHeight(p.x,p.z,regions)+.12,p.z);uv.push(p.x/2,p.z/2);return id;};
  const triangle=(input:Sample[])=>{
    const polygon:Sample[]=[];
    for(let i=0;i<3;i++){const a=input[i],b=input[(i+1)%3];if(a.d<=0)polygon.push(a);if((a.d<=0)!==(b.d<=0)){const t=a.d/(a.d-b.d);polygon.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,d:0});}}
    for(let i=1;i<polygon.length-1;i++)indices.push(vertex(polygon[0]),vertex(polygon[i]),vertex(polygon[i+1]));
  };
  if(points.length>1){
    const minX=Math.min(...points.map(p=>p.x))-width/2,maxX=Math.max(...points.map(p=>p.x))+width/2,minZ=Math.min(...points.map(p=>p.z))-width/2,maxZ=Math.max(...points.map(p=>p.z))+width/2;
    const nx=Math.ceil((maxX-minX)/step),nz=Math.ceil((maxZ-minZ)/step),samples:Sample[][]=[];
    for(let iz=0;iz<=nz;iz++){const row:Sample[]=[];for(let ix=0;ix<=nx;ix++){const x=minX+ix*step,z=minZ+iz*step;row.push({x,z,d:closestRoute(x,z,route).distance-width/2});}samples.push(row);}
    for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=samples[iz][ix],b=samples[iz+1][ix],c=samples[iz][ix+1],d=samples[iz+1][ix+1];triangle([a,b,c]);triangle([c,b,d]);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mat=surfaceMaterial(color,.95,.02,'paving');mat.side=T.DoubleSide;mat.polygonOffset=true;mat.polygonOffsetFactor=-1;mat.polygonOffsetUnits=-1;
  const path=new T.Mesh(geometry,mat);path.receiveShadow=true;path.name='paved-switchback';return path;
}

export function mountainScenery(region:Region,exhibits:Exhibit[],obstacles:Obstacle[]){
  const root=new T.Group();root.position.set(region.position[0],0,region.position[1]);
  const foliage=region.season?seasonalColors[region.season].trees:['#abd0b4','#dfbbcf','#b5cbbb'];
  for(let i=0;i<34;i++){
    const a=i*2.39996,r=20+(i%3)*1.25,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(z>15&&x>1||exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<8.4))continue;
    const y=regionHeight(x,z,region),samples=Array.from({length:8},(_,j)=>regionHeight(x+Math.cos(j*Math.PI/4)*1.35,z+Math.sin(j*Math.PI/4)*1.35,region));
    if(Math.max(...samples)-Math.min(...samples)>.55||Math.hypot(x,z)>region.radius-3)continue;
    const grove=new T.Group();grove.position.set(x,y,z);root.add(grove);tree(grove,0,0,.75+(i%3)*.16,foliage[i%3]);
    obstacles.push({x:x+region.position[0],z:z+region.position[1],radius:.22,height:y+3.8});
    const rock=mesh(grove,new T.IcosahedronGeometry(.45,1),material('#c7c6b4'),.65,.23,.5);rock.scale.set(1,.6,.8);
  }
  const entry=new T.Group();const ex=17.2,ez=15;
  // Keep the visible plinth above its entire slope footprint; a stone footing
  // reaches the downhill ground so raising the sign cannot leave it floating.
  const footingHeights=[regionHeight(ex,ez,region),...Array.from({length:32},(_,i)=>regionHeight(ex+Math.cos(i*Math.PI/16)*.7,ez+Math.sin(i*Math.PI/16)*.7,region))];
  const ey=Math.max(...footingHeights)+.025,footingDepth=ey-Math.min(...footingHeights)+.04;
  entry.position.set(ex,ey,ez);entry.rotation.y=Math.atan2(15.8-ex,19.8-ez);root.add(entry);
  mesh(entry,new T.CylinderGeometry(.69,.69,footingDepth,8),material('#d2cbb6'),0,-footingDepth/2);
  mesh(entry,new T.CylinderGeometry(.5,.7,.22,8),material('#e4d6bb'),0,.11);
  const post=mesh(entry,new T.CylinderGeometry(.12,.18,1.82,12),material('#a8b3a1'),0,.91);post.name='mountain-gate-post';
  mesh(entry,new T.BoxGeometry(.65,.08,.22),material('#a8b3a1'),0,1.86);
  const gate=sign(entry,'AI 山脉','桃花山径',region.color,2.5,.8);gate.position.y=2.35;obstacles.push({x:ex+region.position[0],z:ez+region.position[1],radius:.55,height:ey+3});
  return root;
}
