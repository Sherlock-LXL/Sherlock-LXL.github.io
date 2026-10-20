export async function aimAt(page,{x,y=2.1,z}){
 await page.evaluate(()=>document.exitPointerLock());
 const box=await page.locator('#world canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
 for(let i=0;i<16;i++){
  const s=await page.evaluate(()=>window.__xiangmetaInspect()),dx=x-s.camera[0],dy=y-s.camera[1],dz=z-s.camera[2];
  const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz)),delta=(((yaw-s.yaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2))-Math.PI;
  if(Math.abs(delta)<.005&&Math.abs(pitch-s.pitch)<.005)return;
  const px=Math.max(-150,Math.min(150,-delta/.0023)),py=Math.max(-150,Math.min(150,-(pitch-s.pitch)/.0023));
  await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+px,cy+py,{steps:3});await page.mouse.up();await page.waitForTimeout(40);
 }
}
