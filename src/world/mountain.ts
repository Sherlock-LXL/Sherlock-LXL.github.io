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
  const low=new T.Color('#78a881'),mid=new T.Color(region.season?seasonalColors[region.season].ground:'#a7cfa7'),high=new T.Color('#c8c2a4');
  for(let ring=0;ring<=rings;ring++)for(let j=0;j<=sectors;j++){
    const a=j/sectors*Math.PI*2,r=ring/rings*region.radius,x=Math.cos(a)*r,z=Math.sin(a)*r,y=regionHeight(x,z,region);
    positions.push(x,y,z);uvs.push(x/2.5,z/2.5);
    const h=T.MathUtils.clamp(y/14,0,1),c=low.clone().lerp(mid,T.MathUtils.smoothstep(h,0,.55)).lerp(high,T.MathUtils.smoothstep(h,.62,1));
    c.multiplyScalar(.965+.025*Math.sin(x*.31+z*.19)+.018*Math.cos(z*.47-y*.8));colors.push(c.r,c.g,c.b);
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
      vec3 rockColor=texture2D(rockTexture,terrainPosition.zy/2.15).rgb*weights.x
        +texture2D(rockTexture,terrainPosition.xy/2.15).rgb*weights.z
        +texture2D(rockTexture,terrainPosition.xz/2.15).rgb*weights.y;
      float macro=.5+.5*sin(terrainPosition.x*.23+sin(terrainPosition.z*.17)*1.6);
      rockColor*=mix(vec3(.80,.84,.75),vec3(1.06,.98,.86),macro);
      diffuseColor.rgb*=mix(texture2D(map,vMapUv).rgb,rockColor,smoothstep(0.10,0.34,1.0-abs(normalize(terrainNormal).y)));
      float cliff=smoothstep(0.12,0.4,1.0-abs(normalize(terrainNormal).y));
      float strata=sin(terrainPosition.y*3.45+sin(terrainPosition.x*.42)*.55+sin(terrainPosition.z*.36)*.45);
      diffuseColor.rgb*=1.0-cliff*(.055+.055*strata);
      float shelf=smoothstep(.72,.98,normalize(terrainNormal).y)*smoothstep(2.0,11.0,terrainPosition.y);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.94,1.04,.92),shelf*.18);
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
  const foliage=region.season?seasonalColors[region.season].trees:['#abd0b4','#dfbbcf','#b5cbbb'],routes=mountainRoutes(region);
  for(let i=0;i<34;i++){
    const a=i*2.39996,r=20+(i%3)*1.25,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(z>15&&x>1||exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<8.4))continue;
    if(routes.some(route=>closestRoute(x,z,route).distance<route.width/2+1.2))continue;
    const y=regionHeight(x,z,region),samples=Array.from({length:8},(_,j)=>regionHeight(x+Math.cos(j*Math.PI/4)*1.35,z+Math.sin(j*Math.PI/4)*1.35,region));
    if(Math.max(...samples)-Math.min(...samples)>.55||Math.hypot(x,z)>region.radius-3)continue;
    const grove=new T.Group();grove.position.set(x,y,z);root.add(grove);tree(grove,0,0,.75+(i%3)*.16,foliage[i%3]);
    obstacles.push({x:x+region.position[0],z:z+region.position[1],radius:.22,height:y+3.8});
    const rock=mesh(grove,new T.IcosahedronGeometry(.45,1),material('#c7c6b4'),.65,.23,.5);rock.scale.set(1,.6,.8);
  }
  const outcrops=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),material('#aeb29c',1,0,'stone'),36),pose=new T.Object3D();let outcropCount=0;
  for(let i=0;i<180&&outcropCount<36;i++){
    const a=i*2.39996,r=8+(i%12)*1.25,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x,z)>region.radius-3||exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<5.8)||routes.some(route=>closestRoute(x,z,route).distance<route.width/2+1.4))continue;
    const y=regionHeight(x,z,region),rim=Array.from({length:8},(_,n)=>regionHeight(x+Math.cos(n*Math.PI/4)*.75,z+Math.sin(n*Math.PI/4)*.75,region));
    const spread=Math.max(...rim,y)-Math.min(...rim,y);if(spread<.18||spread>1.7)continue;
    const scale=.32+(i%5)*.11;pose.position.set(x,y+scale*.18,z);pose.rotation.set(i*.37,a,i*.19);pose.scale.set(scale*(1.2+(i%3)*.18),scale*.62,scale);pose.updateMatrix();
    outcrops.setMatrixAt(outcropCount++,pose.matrix);obstacles.push({x:x+region.position[0],z:z+region.position[1],radius:scale*.65,height:y+scale*.8});
  }
  outcrops.count=outcropCount;outcrops.castShadow=true;outcrops.receiveShadow=true;root.add(outcrops);
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
  // A small lookout pagoda occupies an unused western shoulder, clear of all exhibits.
  const summitX=-17,summitZ=-7,summitR=1.8;
  const summitHeights=Array.from({length:32},(_,i)=>regionHeight(summitX+Math.cos(i*Math.PI/16)*summitR,summitZ+Math.sin(i*Math.PI/16)*summitR,region));
  const summitY=Math.max(...summitHeights)+.035,foundationDepth=summitY-Math.min(...summitHeights)+.12;
  const pagoda=new T.Group();pagoda.position.set(summitX,summitY,summitZ);root.add(pagoda);
  const timber=material('#8a5b36',.9,.03,'wood'),warm=material('#d7b57a',.85,.03,'stone'),dark=material('#5f4028',.95,0,'wood'),gold=material('#c8a04b',.4,.6,'metal');
  mesh(pagoda,new T.CylinderGeometry(1.78,1.88,foundationDepth,16),material('#b8aa8d',.95,0,'stone'),0,-foundationDepth/2);
  mesh(pagoda,new T.CylinderGeometry(1.6,1.75,.3,16),warm,0,.15);
  for(let tier=0;tier<3;tier++){
    const r=1.1-tier*.22,y=.4+tier*1.3,h=1.0;
    mesh(pagoda,new T.CylinderGeometry(r,r,h,16),timber,0,y+h/2);
    // Four square windows per tier.
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2;mesh(pagoda,new T.BoxGeometry(.3,.5,.02),dark,Math.sin(a)*(r+.01),y+h/2,Math.cos(a)*(r+.01)).rotation.y=a;}
    // Tiered roof — flared octagonal eaves.
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;
      const ribPts=Array.from({length:9},(_,j)=>{const t=j/8,er=(r+.3)*(1-t*.65);return new T.Vector3(Math.sin(a)*er,y+h+t*.5,Math.cos(a)*er);});
      mesh(pagoda,new T.TubeGeometry(new T.CatmullRomCurve3(ribPts),10,.03,6,false),dark);
    }
    mesh(pagoda,new T.CylinderGeometry(r+.26,r+.26,.07,16),dark,0,y+h+.03);
  }
  mesh(pagoda,new T.CylinderGeometry(.08,.14,.5,8),gold,0,4.8);
  mesh(pagoda,new T.SphereGeometry(.18,16,12),gold,0,5.1);
  mesh(pagoda,new T.ConeGeometry(.1,.3,8),gold,0,5.4);
  obstacles.push({x:summitX+region.position[0],z:summitZ+region.position[1],radius:1.78,height:summitY+5.6});
  // Cherry blossom groves on the slopes.
  const petalMat=material('#f5c5d6',.9,0,'foliage');const pink=material('#eda7bb',.95,0,'foliage');
  for(const [bx,bz] of [[-14,-7],[12,-10],[-18,-2],[16,0],[-6,-14],[10,8]] as [number,number][]){
    if(Math.hypot(bx-summitX,bz-summitZ)<3.6||exhibits.some(m=>Math.hypot(bx-m.position[0],bz-m.position[1])<5.8)||routes.some(route=>closestRoute(bx,bz,route).distance<route.width/2+1.2))continue;
    const by=regionHeight(bx,bz,region);
    const neighbors=Array.from({length:8},(_,i)=>regionHeight(bx+Math.cos(i*Math.PI/4)*1.1,bz+Math.sin(i*Math.PI/4)*1.1,region));
    if(Math.max(...neighbors)-Math.min(...neighbors)>.5)continue;
    const trunk=mesh(root,new T.CylinderGeometry(.08,.14,2.2,10),dark,bx,by+1.1,bz);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2,r=.6+(i%2)*.2;
      const puff=mesh(root,new T.SphereGeometry(.55-i%2*.1,16,12),i%2?petalMat:pink,bx+Math.sin(a)*r,by+2.2+i%2*.15,bz+Math.cos(a)*r);puff.scale.y=.85;
    }
    obstacles.push({x:bx+region.position[0],z:bz+region.position[1],radius:.22,height:by+3});
    void trunk;
  }
  return root;
}
