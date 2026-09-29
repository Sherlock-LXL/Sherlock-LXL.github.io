import * as T from 'three';

/** A resting cat: rear legs tucked into one body silhouette, two visible forepaws. */
export function catSculpture(){
 const cat=new T.Group();cat.name='resting-cat';
 const fur=new T.MeshStandardMaterial({color:'#eadcc6',roughness:.86}),cream=new T.MeshStandardMaterial({color:'#fff1dc',roughness:.88}),pink=new T.MeshStandardMaterial({color:'#d4a3a2',roughness:.8}),ink=new T.MeshStandardMaterial({color:'#465d5a',roughness:.65});
 const ball=(name:string,m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const o=new T.Mesh(new T.SphereGeometry(1,32,24),m);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;cat.add(o);return o;};
 ball('cat-body',fur,0,.63,.91,.7,.51,.87);
 ball('cat-head',fur,0,1.48,1.42,.56,.5,.47);
 ball('cat-chest',cream,0,1.01,1.5,.34,.36,.16);
 for(const side of [-1,1]){
  ball(side<0?'cat-paw-left':'cat-paw-right',cream,side*.265,.21,1.56,.21,.14,.3);
  const outline=new T.Shape();outline.moveTo(-.22,-.15);outline.quadraticCurveTo(-.2,-.2,.2,-.15);outline.quadraticCurveTo(.24,-.1,.035,.24);outline.quadraticCurveTo(0,.29,-.035,.24);outline.quadraticCurveTo(-.24,-.1,-.22,-.15);
  const ear=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:.09,bevelEnabled:true,bevelThickness:.045,bevelSize:.025,bevelSegments:3,curveSegments:12}),fur);ear.position.set(side*.34,1.93,1.37);ear.rotation.z=-side*.19;ear.castShadow=true;cat.add(ear);
  const inner=new T.Mesh(new T.ShapeGeometry(outline,12),pink);inner.scale.set(.63,.64,1);inner.position.set(0,0,.138);ear.add(inner);
  ball('cat-eye',ink,side*.195,1.53,1.858,.048,.068,.027);
  ball('cat-eye-highlight',cream,side*.195-.01,1.553,1.883,.013,.016,.008);
  ball('cat-muzzle',cream,side*.095,1.365,1.829,.14,.11,.105);
 }
 ball('cat-nose',pink,0,1.402,1.929,.045,.032,.025);
 const stroke=(points:number[][],radius:number,m:T.Material)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),o=new T.Mesh(new T.TubeGeometry(curve,20,radius,6,false),m);cat.add(o);return o;};
 for(const side of [-1,1]){stroke([[0,1.38,1.94],[side*.025,1.326,1.936],[side*.07,1.342,1.928]],.009,ink);for(let i=0;i<2;i++)stroke([[side*.22,1.37-i*.065,1.87],[side*.38,1.39-i*.08,1.87],[side*.56,1.42-i*.1,1.84]],.0075,ink);}
 const tail=stroke([[.18,.43,.19],[.66,.31,.16],[.97,.24,.55],[1.0,.235,1.02],[.86,.24,1.34],[.69,.26,1.43]],.12,fur);tail.name='cat-curled-tail';
 // Shrink each tube ring toward its centre, producing a soft tapered tip.
 const pos=tail.geometry.attributes.position,curve=(tail.geometry as T.TubeGeometry).parameters.path;
 for(let i=0;i<=20;i++){const centre=curve.getPointAt(i/20),scale=1-.65*Math.pow(i/20,2);for(let j=0;j<=6;j++){const k=i*7+j;pos.setXYZ(k,centre.x+(pos.getX(k)-centre.x)*scale,centre.y+(pos.getY(k)-centre.y)*scale,centre.z+(pos.getZ(k)-centre.z)*scale);}}tail.geometry.computeVertexNormals();tail.castShadow=true;
 ball('cat-tail-tip',fur,.69,.26,1.43,.043,.043,.043);
 const face=new T.Group();face.name='cat-face';for(const part of [...cat.children])if(!['cat-body','cat-paw-left','cat-paw-right','cat-curled-tail','cat-tail-tip'].includes(part.name))face.add(part);face.position.y=-.2;cat.add(face);
 return cat;
}
