/** 测试导航按第二次 Esc 的方式释放指针；refinement.mjs 另行验证关面板后的自动捕获。 */
export async function releaseMouse(page) {
  await page.evaluate(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  });
  await page.waitForFunction(() => !document.pointerLockElement);
}
