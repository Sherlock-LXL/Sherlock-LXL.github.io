/** Menu navigation in tests explicitly releases the pointer, just as a second Esc does.
 * refinement.mjs separately asserts automatic pointer capture on panel close. */
export async function releaseMouse(page){
  await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});
  await page.waitForFunction(()=>!document.pointerLockElement);
}
