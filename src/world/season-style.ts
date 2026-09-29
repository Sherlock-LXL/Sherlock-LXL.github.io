import * as T from 'three';
import {material,mesh} from './architecture';
export const seasonalColors={
  spring:{ground:'#a7cfa7',trees:['#efb5c9','#e9c2d6','#f2d7c8'],label:'春 · 桃花山径'},
  summer:{ground:'#f6dfa2',trees:['#8bbf9c','#afd09c','#78b7a0'],label:'夏 · 海风绿洲'},
  autumn:{ground:'#c4b58b',trees:['#db944d','#e7bc5e','#c7764e'],label:'秋 · 金色回忆'},
  winter:{ground:'#e7edf0',trees:['#dfe9e8','#d3e3e8','#edf0eb'],label:'冬 · 初雪实验室'}
};
/** Bent trunks and broad arched fronds keep the beach silhouette distinct at map distance. */
export function palm(g:T.Object3D,x:number,z:number,scale=1){
  const group=new T.Group();group.position.set(x,0,z);group.scale.setScalar(scale);g.add(group);
  const trunk=material('#c2aa80',.9,0,'wood'),leaf=material('#85b59b',.9,0,'foliage');
  for(let i=0;i<9;i++){const ring=mesh(group,new T.CylinderGeometry(.105-i*.004,.125-i*.004,.45,8),trunk,Math.sin(i*.11)*.65,.22+i*.39,0);ring.rotation.z=-.13;}
  for(let n=0;n<8;n++){
    const a=n*Math.PI/4,pos:number[]=[],idx:number[]=[];
    for(let i=0;i<=7;i++){const t=i/7,r=t*2.5,y=3.65+Math.sin(t*Math.PI)*.52-t*.68,w=Math.sin(t*Math.PI)*.27;for(const side of [-1,1])pos.push(.48+Math.cos(a)*r-Math.sin(a)*w*side,y,Math.sin(a)*r+Math.cos(a)*w*side);if(i){const k=i*2;idx.push(k-2,k,k-1,k-1,k,k+1);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();leaf.side=T.DoubleSide;mesh(group,geo,leaf);
  }
  for(let i=0;i<3;i++)mesh(group,new T.SphereGeometry(.14,8,6),trunk,.45+Math.cos(i*2)*.18,3.45,Math.sin(i*2)*.18);
}
