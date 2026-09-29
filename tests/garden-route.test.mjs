import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from '../backend/catalog.mjs';
import {mountainRoutes,closestRoute,landings} from '../shared/mountain-route.mjs';
import {groundHeight} from '../shared/terrain-height.mjs';
import {findTrail} from '../shared/trail.mjs';
import {walkable} from '../shared/navigation.mjs';

test('authored switchbacks have smooth samples and terrain follows their centreline',async()=>{
  const {public:c}=await loadCatalog(process.cwd()),r=c.regions.find(r=>r.terrain),routes=mountainRoutes(r);
  assert.equal(routes.length,2);assert.equal(routes[0].width,3.2);
  for(const road of routes){for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i];assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<.45);
    const onLanding=landings(r).some(p=>Math.hypot(b.x-p.x,b.z-p.z)<p.radius+.9);
    if(!onLanding)assert.ok(Math.abs(groundHeight(b.x+r.position[0],b.z+r.position[1],c.regions)-b.y)<(b.z>=18.6?.015:1e-6));
    assert.ok(closestRoute(b.x,b.z,road).distance<1e-8);
  }}
});
test('trail edges cannot slip between grid nodes through a narrow rail',()=>{
  const regions=[{position:[0,0],radius:20}],obstacles=[{x:.35,z:0,radius:.03,height:2,segment:[.35,-1,.35,1]}];
  const route=findTrail({x:-2,z:0},{x:2,z:0},regions,obstacles);
  assert.ok(route.length>2);assert.ok(route.some(p=>Math.abs(p.z)>1));
  for(let i=1;i<route.length;i++)for(let n=0;n<=20;n++){
    const a=route[i-1],b=route[i];assert.ok(walkable(a.x+(b.x-a.x)*n/20,a.z+(b.z-a.z)*n/20,regions,obstacles));
  }
});
