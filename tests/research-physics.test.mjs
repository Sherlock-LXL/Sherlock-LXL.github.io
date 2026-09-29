import test from 'node:test';
import assert from 'node:assert/strict';
import {popovFactor,growthRate,solveGrowth,solveOscillation,P0} from '../shared/research-physics.mjs';
const growth={radius:100,angle:90,tension:72,diffusion:2,saturation:1.2};
const oscillation={radius:4.5,frequency:26.5,tension:72,molality:.5,osmotic:1,kappa:1.4,drive:1.15};
test('paper growth balance: hemispherical Popov factor, Laplace equilibrium and diffusion scaling',()=>{
 assert.ok(Math.abs(popovFactor(Math.PI/2)-2)<1e-8);
 const r=100e-6,eq=1+2*.072/(r*P0);
 assert.ok(Math.abs(growthRate(r,{...growth,saturation:eq}))<1e-15);
 assert.ok(growthRate(r,{...growth,saturation:.9})<0);
 assert.ok(Math.abs(growthRate(r,{...growth,diffusion:3})/growthRate(r,growth)-1.5)<1e-12);
 const s=solveGrowth(growth);assert.ok(s.samples.every((p,i)=>!i||p.r>s.samples[i-1].r));assert.equal(s.samples.at(-1).t,60);
});
test('paper RP equation preserves zero-drive equilibrium, resolves collapse and converges with tolerance',()=>{
 const equilibrium=solveOscillation({...oscillation,drive:0});assert.ok(equilibrium.samples.every(p=>Math.abs(p.r-4.5)<1e-9));
 const a=solveOscillation(oscillation),b=solveOscillation(oscillation,2e-7);
 const min=s=>Math.min(...s.samples.map(p=>p.r)),max=s=>Math.max(...s.samples.map(p=>p.r));
 assert.ok(min(a)<1&&max(a)>15);assert.ok(Math.abs(min(a)/min(b)-1)<.015);assert.ok(Math.abs(max(a)/max(b)-1)<.01);
 assert.ok(a.aw<1&&a.pv<2339);assert.ok(solveOscillation({...oscillation,drive:1.3}).status.includes('适用边界'));
});
