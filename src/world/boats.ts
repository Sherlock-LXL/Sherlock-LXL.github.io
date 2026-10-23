import * as T from 'three';

export type VesselKind='sampan'|'junk'|'fishing';
const mat=(color:string,roughness=.82)=>new T.MeshStandardMaterial({color,roughness,metalness:.03});
const put=(g:T.Object3D,geo:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;};
const line=(g:T.Object3D,points:T.Vector3[],radius:number,m:T.Material)=>put(g,new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(8,points.length*3),radius,6,false),m);
const rod=(g:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,m:T.Material)=>{
  const v=b.clone().sub(a),o=put(g,new T.CylinderGeometry(r,r,v.length(),7),m);
  o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
};
function surface(points:number[],indices:number[]){
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

/** A continuous lofted hull. +Z is the bow; every deck edge and rail follows the same sheer. */
export function buildBoat(kind:VesselKind){
  const root=new T.Group();root.name=`boat-${kind}`;root.userData.dynamic=true;
  const large=kind==='junk',small=kind==='sampan',length=large?3.7:small?1.85:2.65,width=large?1.45:small?.72:1.02,depth=large?.72:small?.38:.52;
  const deckY=large?.5:small?.28:.38,timber=mat('#886a50'),deck=mat('#d3b788'),trim=mat(large?'#d58067':'#4d9490'),dark=mat('#375357'),ivory=mat('#f4eedc'),brass=mat('#d3ae6d',.5);
  const widthAt=(t:number)=>width*Math.pow(Math.max(.0001,Math.sin(Math.PI*(.16+t*.84))),.72)*(1-.12*t);
  const sheer=(t:number)=>deckY+.26*Math.pow(Math.abs(2*t-1),3)+.16*t*t;
  const count=40,section=[[-1,1],[-.88,.22],[-.55,-.7],[0,-1],[.55,-.7],[.88,.22],[1,1]],positions:number[]=[],indices:number[]=[],colors:number[]=[];
  const upper=new T.Color(large?'#558f88':small?'#ae855f':'#68a0b0'),lower=new T.Color('#34565d'),color=new T.Color();
  for(let j=0;j<=count;j++){
    const t=j/count,z=(t*2-1)*length,w=widthAt(t),rim=sheer(t);
    for(const [x,y] of section){
      const h=y>=0?-depth*.12+y*(rim+depth*.12):y*depth*(.65+.35*Math.sin(Math.PI*t));
      const rake=(1-y)*(-.26*Math.pow(t,6)+.07*Math.pow(1-t,6));
      positions.push(x*w,h,z+rake);color.copy(lower).lerp(upper,Math.max(0,(y+.5)/1.5));colors.push(color.r,color.g,color.b);
    }
    if(j<count)for(let i=0;i<section.length-1;i++){const a=j*section.length+i,b=a+section.length;indices.push(a,a+1,b,a+1,b+1,b);}
  }
  for(const j of [0,count])for(let i=1;i<section.length-1;i++){
    const b=j*section.length;indices.push(...(j===0?[b,b+i+1,b+i]:[b,b+i,b+i+1]));
  }
  const hull=surface(positions,indices);hull.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  put(root,hull,new T.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.03})).name='shaped-hull';
  const top:number[]=[],topIndices:number[]=[];
  for(let j=0;j<=count;j++){
    const t=j/count;for(const s of [-1,1])top.push(s*widthAt(t)*.98,sheer(t)-.045,(t*2-1)*length);
    if(j<count){const a=j*2;topIndices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  put(root,surface(top,topIndices),deck).name='fitted-deck';
  for(let j=2;j<count;j+=2){
    const t=j/count;put(root,new T.BoxGeometry(widthAt(t)*1.93,.009,.016),timber,0,sheer(t)-.038,(t*2-1)*length);
  }
  for(const side of [-1,1]){
    const edge=Array.from({length:25},(_,i)=>{const t=i/24;return new T.Vector3(side*widthAt(t),sheer(t)+.012,(t*2-1)*length);});
    line(root,edge,small?.035:.055,trim);
    if(!small){
      const rail=Array.from({length:19},(_,i)=>{const t=.1+i/18*.78;return new T.Vector3(side*widthAt(t)*.99,sheer(t)+.38,(t*2-1)*length);});
      line(root,rail,.027,timber);
      for(let i=0;i<7;i++){
        const t=.1+i/6*.78,x=side*widthAt(t)*.99,z=(t*2-1)*length;
        rod(root,new T.Vector3(x,sheer(t),z),new T.Vector3(x,sheer(t)+.38,z),.027,trim);
      }
    }
  }
  // A restrained curved roof / woven awning, with all ribs seated on the deck.
  const arch=(g:T.Group,w:number,h:number,d:number,y:number,z:number,m:T.Material)=>{
    const p:number[]=[],idx:number[]=[];
    for(let row=0;row<2;row++)for(let i=0;i<=20;i++){const a=i/20*Math.PI;p.push(Math.cos(a)*w/2,y+Math.sin(a)*h,z+(row-.5)*d);if(row===0&&i<20)idx.push(i,i+21,i+1,i+1,i+21,i+22);}
    m.side=T.DoubleSide;put(g,surface(p,idx),m);
    for(let j=0;j<5;j++)line(g,Array.from({length:17},(_,i)=>{const a=i/16*Math.PI;return new T.Vector3(Math.cos(a)*(w/2+.01),y+Math.sin(a)*(h+.012),z+(j/4-.5)*d);}),.018,timber);
  };
  if(small){
    arch(root,1.13,.65,1.72,deckY+.12,-.32,ivory);
    for(const side of [-1,1])put(root,new T.BoxGeometry(.045,.16,1.72),timber,side*.565,deckY+.05,-.32);
    for(const z of [-1.25,.83])put(root,new T.BoxGeometry(1,.09,.25),timber,0,sheer((z/length+1)/2)+.02,z);
    for(const side of [-1,1]){
      const oar=new T.Group();oar.position.set(side*.57,deckY+.16,.75);oar.rotation.y=side*.24;oar.rotation.x=-.12;root.add(oar);
      put(oar,new T.CylinderGeometry(.022,.022,1.85,6),timber,0,0,-.15).rotation.x=Math.PI/2;
      put(oar,new T.BoxGeometry(.14,.035,.52),deck,0,0,-1.13);
    }
  }else{
    const cabinZ=large?-1.73:-.72,cabinW=large?1.75:1.35,cabinD=large?1.5:1.65,cabinH=large?.8:1.05;
    put(root,new T.BoxGeometry(cabinW,cabinH,cabinD),ivory,0,deckY+cabinH/2+.04,cabinZ);
    for(const side of [-1,1]){
      for(const dz of [-.43,0,.43])put(root,new T.BoxGeometry(.018,cabinH*.48,.28),dark,side*(cabinW/2+.011),deckY+cabinH*.58,cabinZ+dz);
      for(const x of [-.46,0,.46])put(root,new T.BoxGeometry(.3,cabinH*.48,.018),dark,x,deckY+cabinH*.58,cabinZ+side*(cabinD/2+.01));
    }
    arch(root,cabinW+.3,.15,cabinD+.3,deckY+cabinH+.07,cabinZ,trim);
    if(large){
      const sail=(z:number,h:number,w:number,yaw:number,m:T.Material,lift=0)=>{
        rod(root,new T.Vector3(0,deckY,z),new T.Vector3(0,deckY+h+.9+lift,z),.048,timber);
        const rig=new T.Group();rig.position.set(.045,deckY+.6+lift,z);rig.rotation.y=yaw;root.add(rig);
        const point=(u:number,v:number)=>new T.Vector3(u*w*(1-.22*v+.09*Math.sin(Math.PI*v)),v*h+u*.42,.24*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));
        const p:number[]=[],idx:number[]=[],nx=10,ny=18;
        for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
          const q=point(i/nx,j/ny);p.push(q.x,q.y,q.z);
          if(j<ny&&i<nx){const a=j*(nx+1)+i,b=a+nx+1;idx.push(a,a+1,b,a+1,b+1,b);}
        }
        m.side=T.DoubleSide;put(rig,surface(p,idx),m).name='curved-sail';
        for(let j=0;j<7;j++)line(rig,Array.from({length:9},(_,i)=>point(i/8,j/6)),.018,timber);
        line(rig,Array.from({length:19},(_,i)=>point(1,i/18)),.013,ivory);
        for(const side of [-1,1])rod(root,new T.Vector3(0,deckY+h+.75+lift,z),new T.Vector3(side*width*.8,deckY+.3,z-.65),.009,ivory);
      };
      sail(.95,3.25,2.15,Math.PI/2-.23,mat('#e2a274',.96));
      sail(-.72,2.1,1.48,Math.PI/2+.1,mat('#efe0ac',.96),.62);
    }else{
      rod(root,new T.Vector3(0,deckY,.7),new T.Vector3(0,3,.7),.035,timber);
      const pennant=surface([0,0,0,.48,-.08,0,0,-.28,0],[0,1,2]),flag=mat('#df9076');flag.side=T.DoubleSide;put(root,pennant,flag,.03,2.92,.7);
      for(const x of [-.5,.5])put(root,new T.CylinderGeometry(.24,.2,.36,12),deck,x,deckY+.2,1.25);
    }
    // Rudder and cleats have a visible connection to the stern and deck.
    put(root,new T.BoxGeometry(.07,.62,.48),timber,0,-.08,-length-.04);
    rod(root,new T.Vector3(0,0,-length),new T.Vector3(0,deckY+.5,-length+.5),.035,timber);
    for(const side of [-1,1])put(root,new T.BoxGeometry(.25,.06,.07),brass,side*widthAt(.15)*.85,sheer(.15)+.07,-length*.7);
  }
  root.userData.mooring=[new T.Vector3(-widthAt(.15)*.85,sheer(.15)+.08,-length*.7),new T.Vector3(widthAt(.15)*.85,sheer(.15)+.08,-length*.7)];
  return root;
}
