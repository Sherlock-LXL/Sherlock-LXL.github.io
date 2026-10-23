import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import * as T from 'three';
import {loadCatalog} from '../backend/catalog.mjs';

test('mirrored static meshes keep outward faces and vertex data when batched',async()=>{
  const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
  try{
    const {batchStatic}=await vite.ssrLoadModule('/src/world/optimizer.ts');
    const root=new T.Group(),geometry=new T.BoxGeometry(1,1,1),material=new T.MeshStandardMaterial();
    const original=Array.from(geometry.attributes.position.array);
    for(const sign of [-1,1]){const mesh=new T.Mesh(geometry,material);mesh.scale.x=sign;mesh.position.x=sign*2;root.add(mesh);}
    const release=batchStatic(root),batch=root.getObjectByName('static-batch');
    assert.ok(batch);assert.deepEqual(Array.from(geometry.attributes.position.array),original);
    const {position:p,normal:n}=batch.geometry.attributes,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    for(let i=0;i<p.count;i+=3){
      a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
      const face=b.sub(a).cross(c.sub(a)).normalize(),normal=new T.Vector3().fromBufferAttribute(n,i);
      assert.ok(face.dot(normal)>.999,'triangle winding agrees with its outward normal');
    }
    release();batch.geometry.dispose();geometry.dispose();material.dispose();
  }finally{await vite.close();}
});

test('real flocks fade before recycling; fish relocate and leave no traffic conflicts over five minutes',async()=>{
  const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
  try{
    const {AmbientLife}=await vite.ssrLoadModule('/src/world/ambient-life.ts');
    const {public:{regions}}=await loadCatalog(process.cwd()),scene=new T.Scene(),life=new AmbientLife(scene,regions),routes=new Set();
    let previous=life.snapshot,cycles=0;
    for(let i=0;i<18000;i++){
      life.update(1/60,false,10);const next=life.snapshot;
      for(let j=0;j<3;j++)if(previous.birdOpacities[j]>0&&next.birdOpacities[j]===0){assert.ok(previous.birdOpacities[j]<.001);cycles++;}
      assert.ok(next.fishBoatBuffer>7);
      next.fishRoutes.forEach(r=>routes.add(`${r.x.toFixed(2)},${r.z.toFixed(2)}`));previous=next;
    }
    assert.ok(cycles>10);assert.ok(routes.size>70);
    for(let i=0;i<3000&&!life.snapshot.birdOpacities.some(a=>a>.8);i++)life.update(1/60,false,10);
    assert.ok(life.snapshot.birdOpacities.some(a=>a>.8));
    life.update(1/60,false,22);assert.ok(life.snapshot.birdOpacities.some(a=>a>.7));
    for(let i=0;i<300;i++)life.update(1/60,false,22);
    assert.equal(life.snapshot.activeFlybys,0);
    life.update(1/60,true,10);assert.equal(life.snapshot.activeFish,0);life.dispose();
  }finally{await vite.close();}
});
