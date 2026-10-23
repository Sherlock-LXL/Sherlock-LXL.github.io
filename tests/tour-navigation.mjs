import assert from 'node:assert/strict';
import {makeCourse,createRace,createVehicle,advanceVehicle,advanceRace,angleDiff} from '../shared/seasonal-games.mjs';
import {LivingNavigation} from '../shared/living-navigation.mjs';

/** Replay two complete laps against the scene's real colliders, without teleporting. */
export function verifyTours(regions,obstacles,ids=['spring','summer','autumn']){
  const nav=new LivingNavigation(regions,obstacles),results=[];
  for(const id of ids){
    const course=makeCourse(id,regions,obstacles),s=createVehicle(id,course.spawn),race=createRace(course);race.countdown=0;
    let target=3,stalled=0,hits=0;
    for(let i=0;i<60000&&!race.finished;i++){
      let p=course.path[target],distance=Math.hypot(p.x-s.x,p.z-s.z);
      while(distance<(id==='spring'?.75:id==='summer'?1.4:3.8)){target=(target+1)%course.path.length;p=course.path[target];distance=Math.hypot(p.x-s.x,p.z-s.z);}
      const angle=angleDiff(s.yaw,Math.atan2(p.x-s.x,p.z-s.z)),before={...s};
      const desired=id==='spring'?(Math.abs(angle)>.4?.8:Math.abs(angle)>.18?2.5:4.5):Math.abs(angle)>.15?3:10;
      advanceVehicle(s,{
        turn:Math.max(-1,Math.min(1,angle*3)),
        throttle:id==='autumn'?Math.max(-1,Math.min(1,(s.y-p.y)*.28)):s.speed<desired?1:0,
        brake:id==='autumn'?Math.abs(angle)>.25:s.speed>desired+.2,
      },1/60,regions,[...nav.nearby(s.x,s.z,7)],i/60);
      advanceRace(race,before,s,1/60);if(s.hit)hits++;
      if(Math.hypot(s.x-before.x,s.z-before.z)<.00001)stalled++;else stalled=0;
      if(stalled>150)break;
    }
    console.log('tour',id,{length:course.length,finished:race.finished,passed:race.passed,next:race.next,hits,target,position:[s.x,s.y,s.z],point:course.path[target]});
    assert.equal(race.finished,true,`${id}: all ordered gates and two laps`);
    assert.equal(hits,0,`${id}: course can be driven without collision`);
    if(id==='spring')for(const r of regions)assert.ok(course.path.some(p=>Math.hypot(p.x-r.position[0],p.z-r.position[1])<r.radius-4),`visits ${r.season}`);
    results.push({id,length:course.length,seconds:race.elapsed,gates:course.gates.length});
  }
  return results;
}
