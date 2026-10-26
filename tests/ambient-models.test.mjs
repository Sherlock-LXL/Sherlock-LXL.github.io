import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import * as T from 'three';
import {loadCatalog} from '../backend/catalog.mjs';
import {distantIslands,distantGround,distantContains} from '../shared/distant-islands.mjs';

async function withCanvasModels(check){
  const original=globalThis.document,gradient={addColorStop(){}};
  const context=new Proxy({measureText:text=>({width:text.length*32}),createLinearGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
  globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
  const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  try{await check(vite);}finally{await vite.close();if(original===undefined)delete globalThis.document;else globalThis.document=original;}
}

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

test('round pavilion tiles and lantern caps stop a ray cast from above',async()=>{
  await withCanvasModels(async vite=>{
    const {roundRoof,lantern}=await vite.ssrLoadModule('/src/world/vernacular.ts'),root=new T.Group();
    roundRoof(root,{radius:3,height:1.5});root.updateMatrixWorld(true);
    const tiles=root.getObjectByName('round-roof-tiles'),normal=tiles.geometry.attributes.normal;
    for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>0,'roof skin has an upward normal');
    const ray=new T.Raycaster(new T.Vector3(1,4,0),new T.Vector3(0,-1,0));
    assert.ok(ray.intersectObject(tiles).length>0,'front faces remain visible from the sky');
    const lamp=lantern(new T.Group(),0,0);lamp.updateMatrixWorld(true);
    ray.set(new T.Vector3(.2,3,0),new T.Vector3(0,-1,0));
    assert.ok(ray.intersectObject(lamp.getObjectByName('lantern-cap')).length>0,'stone cap faces outward');
  });
});

test('distant planting clears the halls; piers reach the seabed and tilted sundials clear their plinths',async()=>{
  await withCanvasModels(async vite=>{
    const {exchangeIsland,robotDistrict,researchInstitute,distantColliders}=await vite.ssrLoadModule('/src/world/future-landmarks.ts');
    for(const root of [exchangeIsland(),robotDistrict(),researchInstitute()]){
      root.updateMatrixWorld(true);
      const spec=distantIslands.find(s=>s.name===root.name),halls=root.getObjectsByProperty('name','horizon-hall').map(h=>new T.Box3().setFromObject(h));
      for(let i=0;i<halls.length;i++)for(let j=i+1;j<halls.length;j++)assert.ok(!halls[i].intersectsBox(halls[j]),'neighbouring halls leave space between their eaves');
      const structures=[...halls,...['horizon-institute','horizon-colonnade','horizon-automaton'].flatMap(name=>root.getObjectsByProperty('name',name).map(o=>new T.Box3().setFromObject(o)))];
      for(const lamp of root.getObjectsByProperty('name','horizon-lantern')){
        const bounds=new T.Box3().setFromObject(lamp);
        assert.ok(Math.abs(bounds.min.y-distantGround)<.00001,'stone lantern foot meets the land');
        assert.ok(structures.every(b=>!b.intersectsBox(bounds)),'lanterns remain outside raised platforms and buildings');
      }
      const trees=root.getObjectsByProperty('name','horizon-tree');
      assert.equal(trees.length,6);
      for(const tree of trees){
        const bounds=new T.Box3().setFromObject(tree);
        assert.ok(bounds.min.y<=distantGround&&bounds.min.y>distantGround-.08,'roots meet the land');
        assert.ok(halls.every(h=>!h.intersectsBox(bounds)),'crowns leave clearance around real roof bounds');
        tree.traverse(o=>{
          if(!o.isMesh)return;
          const p=o.geometry.attributes.position,v=new T.Vector3();
          for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert.ok(distantContains(v.x,v.z,spec),'entire tree remains inside the island');}
        });
      }
      const deck=new T.Box3().setFromObject(root.getObjectByName('horizon-dock-deck'));
      assert.ok(deck.min.y>-5.65,'timber deck remains clear of the water');
      for(const pile of root.getObjectsByProperty('name','horizon-dock-pile')){
        const bounds=new T.Box3().setFromObject(pile);
        assert.ok(bounds.min.y<-7.2&&bounds.max.y>deck.max.y,'pile supports the deck from below the seabed');
      }
      for(const sundial of root.getObjectsByProperty('name','horizon-sundial')){
        const plinth=new T.Box3().setFromObject(sundial.children[0]),face=new T.Box3().setFromObject(sundial.getObjectByName('horizon-dial-face'));
        assert.ok(face.min.y>plinth.max.y+.02,'tilted bronze rim does not sink into the stone');
      }
      const colliders=distantColliders(root);
      assert.equal(colliders.filter(o=>o.surface).length,1);
      assert.ok(colliders.every(o=>Number.isFinite(o.base)&&Number.isFinite(o.height)&&o.base<o.height));
    }
  });
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
