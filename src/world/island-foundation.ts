import * as T from 'three';
import {material,mesh} from './architecture';
import {batchStatic} from './optimizer';

/** Sculpt only below the walking plane; the established terrain/collision stays exact. */
export function islandFoundation(radius:number,x:number,z:number){
  const group=new T.Group();group.name='stratified-island';group.position.set(x,0,z);
  const sections=[[-.24,1],[-.6,1.008],[-1.1,.98],[-1.55,1.002],[-2.3,.955],[-2.65,.976],[-3.6,.90],[-4.25,.915],[-5.65,.81],[-6.2,.77]];
  const sectors=128,positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
  const tones=['#b8baa0','#bfbeaa','#c6b79e','#d4c1a4','#baa98e','#c1b49c','#9fada0','#afbaac','#778f88','#718982'];
  for(let row=0;row<sections.length;row++)for(let j=0;j<=sectors;j++){
    const a=j/sectors*Math.PI*2,[height,scale]=sections[row];
    const variation=(Math.sin(a*7+x*.4)*.6+Math.sin(a*13+z*.7)*.25+Math.cos(a*23)*.15);
    const r=radius*scale+variation*(row===0?.025:.35+radius*.015);
    const y=height+(row===0?0:Math.sin(a*5+x)*.15+Math.sin(a*17+row*.4)*.045);
    positions.push(Math.cos(a)*r,y,Math.sin(a)*r);uvs.push(j/sectors*radius*2, -height/2);
    const c=new T.Color(tones[row]).multiplyScalar(.95+.05*Math.sin(a*19+row));colors.push(c.r,c.g,c.b);
    if(row<sections.length-1&&j<sectors){const p=row*(sectors+1)+j,q=p+sectors+1;indices.push(p,p+1,q,q,p+1,q+1);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  const stone=material('#ffffff',.98,0,'cliff');stone.vertexColors=true;
  mesh(group,geo,stone);
  const rock=material('#9cae9d',1,0,'stone'),sand=material('#dbceb1',1,0,'sand');
  for(let i=0;i<22;i++){
    const a=i*2.39996,r=radius*(.88+(i%3)*.018),s=.65+(i%4)*.27;
    const boulder=mesh(group,new T.DodecahedronGeometry(1,0),i%3?rock:sand,Math.cos(a)*r,-4.95+(i%3)*.19,Math.sin(a)*r);
    boulder.scale.set(s*1.8,s*.65,s);boulder.rotation.set(i*.2,a,i*.1);
  }
  return {group,release:batchStatic(group)};
}
