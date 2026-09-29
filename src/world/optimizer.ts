import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch opaque static meshes within a single island; retain island-level frustum culling.
 * Animated subtrees, instancing and transparent glass keep their original ownership. */
export function batchStatic(root:T.Object3D){
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),buckets=new Map<string,{material:T.Material;meshes:T.Mesh[];shadow:boolean}>();
  const retired=new Set<T.BufferGeometry>(),retiredMaterials=new Set<T.Material>();
  root.traverse(object=>{
    if(!(object instanceof T.Mesh)||object instanceof T.InstancedMesh||object instanceof T.SkinnedMesh||Array.isArray(object.material))return;
    for(let p:T.Object3D|null=object;p&&p!==root;p=p.parent)if(p.name==='pulse'||p.userData.dynamic)return;
    const m=object.material;
    if(m.transparent||!(m instanceof T.MeshStandardMaterial||m instanceof T.MeshBasicMaterial))return;
    if(object.geometry.morphAttributes.position||object.geometry.getAttribute('skinIndex'))return;
    const standard=m instanceof T.MeshStandardMaterial?m:null;
    const key=JSON.stringify([m.type,m.color.getHex(),m.map?.uuid,m.side,standard?.bumpMap?.uuid,standard?.bumpScale,standard?.normalMap?.uuid,standard?.normalScale.toArray(),standard?.roughnessMap?.uuid,m.customProgramCacheKey(),standard?.roughness,standard?.metalness,standard?.emissive.getHex(),standard?.emissiveIntensity,m.userData.nightGlow,object.castShadow,object.receiveShadow,Object.keys(object.geometry.attributes).sort()]);
    let bucket=buckets.get(key);if(!bucket){bucket={material:m,meshes:[],shadow:object.castShadow};buckets.set(key,bucket);}bucket.meshes.push(object);
  });
  for(const {material,meshes,shadow} of buckets.values()){
    if(meshes.length<2)continue;
    const baked=meshes.map(m=>{
      const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
      geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld));return geometry;
    });
    const geometry=mergeGeometries(baked,false);baked.forEach(g=>g.dispose());if(!geometry)continue;
    geometry.computeBoundingSphere();const batch=new T.Mesh(geometry,material);batch.name='static-batch';batch.castShadow=shadow;batch.receiveShadow=meshes[0].receiveShadow;root.add(batch);
    for(const object of meshes){retired.add(object.geometry);if(object.material!==material)retiredMaterials.add(object.material as T.Material);object.removeFromParent();}
    batch.updateMatrix();batch.matrixAutoUpdate=false;
  }
  // Shared source geometries may still belong to another island; retire at world shutdown.
  return ()=>{retired.forEach(g=>g.dispose());retiredMaterials.forEach(m=>m.dispose());};
}
