import * as T from 'three';
import {material,mesh} from './architecture';
import {batchStatic} from './optimizer';

const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Mean radius where an island's rock base meets the sea; the water shader foams along it. */
export const shoreRadius=(radius:number)=>radius*1.085+.35;
/** [height, radial scale, angular relief in metres]. Alternating faces and shelves read as strata. */
const profile:[number,number,number][]=[[-.2,1,.02],[-.5,1.003,.1],[-.9,.998,.18],[-1.12,1.03,.32],[-1.65,1.022,.34],[-2.15,1.014,.4],[-2.38,1.05,.5],[-2.95,1.042,.52],[-3.5,1.035,.56],[-3.72,1.068,.6],[-4.3,1.062,.62],[-4.95,1.07,.55],[-5.45,1.082,.45],[-5.9,1.1,.5],[-6.6,1.12,.55]];
const tones={moss:new T.Color('#7c9f72'),mossDeep:new T.Color('#55806a'),azurite:new T.Color('#5d8590'),ochre:new T.Color('#c19a64'),umber:new T.Color('#8d6f4d'),wet:new T.Color('#4a5b5c'),sand:new T.Color('#d8c49a')};

/** Sculpt only below the walking plane; the established terrain and collision stay exact.
 * `openings` are local angles (atan2(z,x)) with half-widths where bridges and piers need a sheer face. */
export function islandFoundation(radius:number,x:number,z:number,openings:{angle:number;half:number}[]=[]){
  const group=new T.Group();group.name='stratified-island';group.position.set(x,0,z);
  const sectors=176,positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  const seed=x*.37+z*.71,open=(a:number)=>openings.reduce((m,o)=>{const d=Math.abs(Math.atan2(Math.sin(a-o.angle),Math.cos(a-o.angle)));return Math.max(m,1-smooth(o.half,o.half+.28,d));},0);
  let previous:number[]=[];
  for(let row=0;row<profile.length;row++){
    const [height,scale,relief]=profile[row],ring:number[]=[];
    for(let j=0;j<=sectors;j++){
      const a=j/sectors*Math.PI*2,calm=1-open(a)*.85;
      const n=Math.sin(a*5+seed+row*.9)*.5+Math.sin(a*11-seed*1.3+row*1.7)*.3+Math.sin(a*23+row*2.3)*.2;
      let r=radius*(1+(scale-1)*calm)+n*relief*calm;
      if(row&&r<previous[j]-.12)r=previous[j]-.12;ring.push(r);
      const y=height+(row===0||row===profile.length-1?0:Math.sin(a*9+row*1.3+seed)*.07);
      positions.push(Math.cos(a)*r,y,Math.sin(a)*r);uvs.push(j/sectors*radius*2,-height/2);
      // Wound so faces (and the shelf test below) look out to sea.
      if(row<profile.length-1&&j<sectors){const p=row*(sectors+1)+j,q=p+sectors+1;indices.push(p,p+1,q,q,p+1,q+1);}
    }
    previous=ring;
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  // Blue-green manner: ochre faces, malachite resting on every shelf, dark wet rock at the tide line.
  const normals=geo.attributes.normal,colors:number[]=[],c=new T.Color();
  for(let i=0;i<normals.count;i++){
    const y=positions[i*3+1],up=normals.getY(i),a=Math.atan2(positions[i*3+2],positions[i*3]);
    const band=.5+.5*Math.sin(y*5.3+Math.sin(a*3+seed)*.8);
    c.copy(tones.ochre).lerp(tones.umber,smooth(-1.5,-4.2,y)*.75+band*.18);
    c.lerp(tones.azurite,smooth(.1,.9,Math.sin(a*4+seed*2)*.5+.5)*.22*smooth(-.8,-3,y));
    c.lerp(tones.wet,smooth(-4.6,-5.7,y));
    const shelf=smooth(.32,.72,up);c.lerp(y>-4.4?(band>.5?tones.moss:tones.mossDeep):tones.sand,shelf*.85);
    c.multiplyScalar(.94+.08*Math.sin(a*31+y*7));colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const stone=material('#ffffff',.96,0,'cliff');stone.vertexColors=true;
  mesh(group,geo,stone);
  // Weathered rocks gather where the base meets the water, leaving every opening clear.
  const rockGeometries=[0,1,2].map(k=>{const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position,colorsRock:number[]=[];
    for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i),s=1+.18*Math.sin(vx*3.1+k*2+vz*2.3)+.1*Math.sin(vy*5.7-k);p.setXYZ(i,vx*s,vy*s*(vy>0?1:.6),vz*s);
      const tone=tones.ochre.clone().lerp(tones.umber,.4).lerp(tones.wet,smooth(.2,-.6,vy));if(vy>.55)tone.lerp(tones.moss,.6);colorsRock.push(tone.r,tone.g,tone.b);}
    g.setAttribute('color',new T.Float32BufferAttribute(colorsRock,3));g.computeVertexNormals();return g;});
  const rock=material('#ffffff',.95,0,'stone');rock.vertexColors=true;
  const count=Math.round(radius*1.5);
  for(let i=0;i<count;i++){
    const a=i*2.39996+seed;if(open(a)>.05)continue;
    const r=shoreRadius(radius)+(-.6+(i%5)*.35),s=.45+((i*7)%11)/11*1.15;
    const boulder=mesh(group,rockGeometries[i%3],rock,Math.cos(a)*r,-5.75+s*.25,Math.sin(a)*r);
    boulder.scale.set(s*(1.1+(i%3)*.3),s*(.7+(i%4)*.18),s);boulder.rotation.set((i%7)*.3,a,(i%5)*.2);boulder.castShadow=false;
  }
  return {group,release:batchStatic(group)};
}
