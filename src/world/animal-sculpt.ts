import * as T from 'three';

export type Volume=[number,number,number,number,number,number];
/** Smooth union of anatomical volumes, sampled once at startup into a continuous skin.
 * No downloaded assets, runtime remeshing, or visible intersections between torso volumes. */
export function skin(volumes:Volume[],blend=.045,resolution=.035){
  const field=(x:number,y:number,z:number)=>{
    let d=1e6;
    for(const [cx,cy,cz,rx,ry,rz] of volumes){
      const q=(Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz)-1)*Math.min(rx,ry,rz);
      const h=Math.max(0,blend-Math.abs(d-q))/blend;d=Math.min(d,q)-h*h*blend*.25;
    }
    return d;
  };
  const lo=[0,1,2].map(k=>Math.min(...volumes.map(v=>v[k]-v[k+3]))-blend);
  const hi=[0,1,2].map(k=>Math.max(...volumes.map(v=>v[k]+v[k+3]))+blend);
  const n=hi.map((v,k)=>Math.ceil((v-lo[k])/resolution)),step=n.map((v,k)=>(hi[k]-lo[k])/v);
  const index=(x:number,y:number,z:number)=>(x*(n[1]+1)+y)*(n[2]+1)+z;
  const samples=new Float32Array((n[0]+1)*(n[1]+1)*(n[2]+1));
  for(let x=0;x<=n[0];x++)for(let y=0;y<=n[1];y++)for(let z=0;z<=n[2];z++)
    samples[index(x,y,z)]=field(lo[0]+x*step[0],lo[1]+y*step[1],lo[2]+z*step[2]);
  const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const pos:number[]=[],norm:number[]=[],uv:number[]=[];
  const normal=(p:number[])=>new T.Vector3(
    field(p[0]+.001,p[1],p[2])-field(p[0]-.001,p[1],p[2]),
    field(p[0],p[1]+.001,p[2])-field(p[0],p[1]-.001,p[2]),
    field(p[0],p[1],p[2]+.001)-field(p[0],p[1],p[2]-.001)).normalize();
  const triangle=(a:number[],b:number[],c:number[])=>{
    const ns=[normal(a),normal(b),normal(c)];
    const cross=new T.Vector3().subVectors(new T.Vector3(...b),new T.Vector3(...a))
      .cross(new T.Vector3().subVectors(new T.Vector3(...c),new T.Vector3(...a)));
    if(cross.dot(ns[0])<0){[b,c]=[c,b];[ns[1],ns[2]]=[ns[2],ns[1]];}
    [a,b,c].forEach((p,i)=>{pos.push(...p);norm.push(...ns[i].toArray());uv.push(p[2],p[1]);});
  };
  for(let x=0;x<n[0];x++)for(let y=0;y<n[1];y++)for(let z=0;z<n[2];z++){
    const values=corners.map(([a,b,c])=>samples[index(x+a,y+b,z+c)]);
    if(values.every(d=>d>0)||values.every(d=>d<=0))continue;
    const points=corners.map(([a,b,c])=>[lo[0]+(x+a)*step[0],lo[1]+(y+b)*step[1],lo[2]+(z+c)*step[2]]);
    const cut=(a:number,b:number)=>points[a].map((v,k)=>T.MathUtils.lerp(v,points[b][k],values[a]/(values[a]-values[b])));
    for(const t of tetra){
      const inside=t.filter(i=>values[i]<=0),outside=t.filter(i=>values[i]>0);
      if(inside.length===1){const a=inside[0];triangle(...outside.map(b=>cut(a,b)) as [number[],number[],number[]]);}
      else if(inside.length===3){const a=outside[0];triangle(...inside.map(b=>cut(a,b)) as [number[],number[],number[]]);}
      else if(inside.length===2){
        const [a,b]=inside,[c,d]=outside,p=cut(a,c),q=cut(a,d),r=cut(b,c),s=cut(b,d);triangle(p,q,r);triangle(q,s,r);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeBoundingSphere();return geometry;
}

/** A tapered curved form for tails, feather quills, toes and antlers. */
export function tapered(points:number[][],radii:number[],sides=10,segments=24){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(segments,false);
  const pos:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=curve.getPointAt(t),f=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(f));
    const radius=T.MathUtils.lerp(radii[j],radii[j+1],f-j);
    for(let k=0;k<=sides;k++){
      const angle=k/sides*Math.PI*2,v=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*radius).addScaledVector(frames.binormals[i],Math.sin(angle)*radius);
      pos.push(...v.toArray());uv.push(k/sides,t);
      if(i<segments&&k<sides){const a=i*(sides+1)+k,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
