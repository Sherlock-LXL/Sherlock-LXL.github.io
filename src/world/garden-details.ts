import * as T from 'three';
import {surfaceMaterial} from './surfaces';
export type FlowerPoint={x:number;y:number;z:number};
/** Flowers share three instance draws regardless of the number of garden pockets. */
export function flowerDrifts(points:FlowerPoint[]){
  const root=new T.Group();if(!points.length)return root;
  const petals=new T.InstancedMesh(new T.SphereGeometry(1,6,4),surfaceMaterial('#ffffff',.92,0,'foliage'),points.length*6);
  const stems=new T.InstancedMesh(new T.CylinderGeometry(.012,.017,1,5),surfaceMaterial('#7d9e75',.95,0,'foliage'),points.length);
  const leaves=new T.InstancedMesh(new T.SphereGeometry(1,6,4),surfaceMaterial('#91b483',.95,0,'foliage'),points.length*2),pose=new T.Object3D();
  const palette=['#edb4c6','#ead79d','#c6b7e0','#f1e9d1'];
  points.forEach((p,i)=>{
    const h=.24+(i%4)*.055;pose.position.set(p.x,p.y+h/2,p.z);pose.rotation.set(0,0,Math.sin(i)*.08);pose.scale.set(1,h,1);pose.updateMatrix();stems.setMatrixAt(i,pose.matrix);
    for(let j=0;j<6;j++){const a=j*Math.PI*2/5;pose.position.set(p.x+(j<5?Math.cos(a)*.075:0),p.y+h+(j===5?.025:0),p.z+(j<5?Math.sin(a)*.075:0));pose.rotation.set(0,-a,0);pose.scale.set(j===5?.048:.092,j===5?.032:.024,j===5?.048:.056);pose.updateMatrix();petals.setMatrixAt(i*6+j,pose.matrix);petals.setColorAt(i*6+j,new T.Color(j===5?'#ddbb75':palette[Math.floor(i/3)%4]));}
    for(let j=0;j<2;j++){pose.position.set(p.x+(j?1:-1)*.055,p.y+h*.45,p.z);pose.rotation.set(0,i, j?.3:-.3);pose.scale.set(.09,.019,.035);pose.updateMatrix();leaves.setMatrixAt(i*2+j,pose.matrix);}
  });
  root.add(petals,stems,leaves);return root;
}
