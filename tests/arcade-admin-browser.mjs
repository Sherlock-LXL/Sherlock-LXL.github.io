import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { staticServer } from "./ai-lab-server.mjs";
import { mergeLine } from "../shared/arcade.mjs";

const out = process.env.GAME_ARTIFACTS ?? "/private/tmp/xiangmeta-2048/browser";
await mkdir(out, { recursive: true });
const server = process.env.GAME_ORIGIN ? null : await staticServer();
const origin = process.env.GAME_ORIGIN ?? server.origin;
const browser = await chromium.launch({
  headless: true,
  args:
    process.platform === "darwin"
      ? ["--use-angle=metal"]
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const evidence = [];
const keys = ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"];
const state = (s) => ({
  board: s.board,
  score: s.score,
  moves: s.moves,
  won: s.won,
  over: s.over,
});

async function check(touch = false) {
  const context = await browser.newContext({
    viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    hasTouch: touch,
    isMobile: touch,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error" || /GL_INVALID|INVALID_OPERATION|WebGL.*warning/i.test(e.text()))
      errors.push(e.text());
  });
  page.on("requestfailed", (r) => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  const read = () => page.evaluate(() => window.__xiangmetaInspect().games.arcade);
  const click = async (selector) => {
    const el = page.locator(selector);
    await el.waitFor({ state: "visible" });
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    assert.ok(b);
    if (touch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  const settled = () =>
    page.waitForFunction(() => {
      const s = window.__xiangmetaInspect().games.arcade;
      return s?.mergeAge === 0.12 && !s.playback;
    });
  const open = async (modifier = "Control") => {
    await page.keyboard.press(`${modifier}+z`);
    await page.locator("dialog.arcade-admin[open]").waitFor({ state: "visible" });
    assert.equal(await page.locator(".arcade-admin h2").innerText(), "请输入管理员密码");
    assert.equal(await page.locator(".admin-dots i").count(), 6);
    assert.equal(await page.locator(".admin-dots .filled").count(), 0);
  };
  const closed = () => page.locator("dialog.arcade-admin").waitFor({ state: "detached" });
  const enter = async () => {
    if (touch) for (const digit of "260904") await click(`[data-digit="${digit}"]`);
    else await page.keyboard.type("260904", { delay: 15 });
  };
  const move = async (key) => {
    await page.keyboard.press(key);
    await settled();
    return read();
  };
  const hidden = async () => {
    const markup = await page.locator(".seasonal-dialog").evaluate((el) => el.outerHTML);
    assert.ok(!/撤回|撤销|回溯|undo|rewind|Control\+z|Ctrl|⌘/i.test(markup));
    if (await page.locator(".arcade-admin").count()) {
      const pinMarkup = await page.locator(".arcade-admin").evaluate((el) => el.outerHTML);
      assert.ok(!/260904|撤回|撤销|回溯|undo|rewind/i.test(pinMarkup));
    }
  };
  const fit = async () => {
    const layout = await page.locator(".arcade-admin").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        right: r.right,
        bottom: r.bottom,
        width: innerWidth,
        height: innerHeight,
        scroll: el.scrollHeight,
        client: el.clientHeight,
        buttons: [...el.querySelectorAll("button")].map((b) => {
          const r = b.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, size: r.width };
        }),
      };
    });
    assert.ok(layout.x >= 0 && layout.y >= 0);
    assert.ok(layout.right <= layout.width && layout.bottom <= layout.height);
    assert.ok(layout.right - layout.x <= 351, "password panel stays compact");
    assert.ok(Math.abs((layout.x + layout.right) / 2 - layout.width / 2) < 1);
    assert.ok(Math.abs((layout.y + layout.bottom) / 2 - layout.height / 2) < 1);
    assert.ok(layout.scroll <= layout.client + 1, "keypad fits without scrolling");
    for (const b of layout.buttons) {
      assert.ok(b.x >= layout.x && b.right <= layout.right);
      assert.ok(b.y >= layout.y && b.bottom <= layout.bottom);
      assert.ok(b.size >= 44, "touch targets stay usable");
    }
  };
  try {
    await page.goto(origin + "/world/?inspect");
    await page.waitForFunction(
      () => window.__xiangmetaInspect && !document.querySelector("#world-loading"),
      null,
      { timeout: 90000 },
    );
    await click("#help");
    await click("#low-quality");
    await click("#close-panel");
    if (touch) {
      await click("#mobile-menu");
      await page.waitForFunction(
        () => Math.abs(document.querySelector(".sidebar").getBoundingClientRect().x) < 1,
      );
    }
    await click("#seasonal-games");
    await click("[data-arcade]");
    await click('[data-game="merge"]');
    await settled();
    const snapshots = [state(await read())];
    for (let i = 0; snapshots.length < 13 && i < 50; i++) {
      const s = await move(keys[i % 4]);
      if (s.moves > snapshots.at(-1).moves) snapshots.push(state(s));
    }
    assert.equal(snapshots.length, 13);
    const before = state(await read());
    const player = await page.evaluate(() => window.__xiangmetaInspect().player);
    await hidden();
    await open();
    await fit();
    await hidden();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("w");
    await page.keyboard.press("p");
    await page.keyboard.press("2");
    await page.keyboard.press("6");
    assert.equal(await page.locator(".admin-dots .filled").count(), 2);
    await click("[data-delete]");
    assert.equal(await page.locator(".admin-dots .filled").count(), 1);
    await page.keyboard.press("Backspace");
    await page.keyboard.type("111111");
    await page.waitForFunction(() =>
      document.querySelector(".admin-message")?.textContent.includes("密码不正确"),
    );
    await page.waitForFunction(() => document.querySelectorAll(".admin-dots .filled").length === 0);
    assert.deepEqual(state(await read()), before);
    const frozenPlayer = await page.evaluate(() => window.__xiangmetaInspect().player);
    assert.deepEqual([frozenPlayer.x, frozenPlayer.z], [player.x, player.z]);
    await page.screenshot({ path: `${out}/${touch ? "mobile" : "desktop"}-wrong-pin.png` });
    await page.keyboard.press("Escape");
    await closed();
    assert.deepEqual(state(await read()), before);
    assert.equal((await read()).id, "merge", "Esc only closes the password layer");

    await open("Meta");
    await page.screenshot({ path: `${out}/${touch ? "mobile" : "desktop"}-pin.png` });
    await page.evaluate(() => {
      window.__adminFrames = [];
      let started = false;
      const track = () => {
        const s = window.__xiangmetaInspect().games.arcade;
        if (s.playback) started = true;
        if (started) window.__adminFrames.push(structuredClone(s));
        if (!started || s.playback) requestAnimationFrame(track);
      };
      requestAnimationFrame(track);
    });
    await enter();
    await closed();
    await page.waitForFunction(() => window.__xiangmetaInspect().games.arcade.playback?.age > 0.08);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Control+z");
    assert.equal(
      await page.locator(".arcade-admin").count(),
      0,
      "re-entry is blocked during playback",
    );
    await page.screenshot({ path: `${out}/${touch ? "mobile" : "desktop"}-animation.png` });
    await settled();
    const target = snapshots.at(-6);
    assert.deepEqual(state(await read()), target);
    const frames = await page.evaluate(() => window.__adminFrames);
    for (let step = 0; step < 5; step++) {
      const frame = frames.find((s) => s.playback?.step === step);
      assert.ok(frame, `reverse animation includes step ${step + 1}`);
      assert.equal(frame.playback.total, 5);
      assert.deepEqual(state(frame), snapshots.at(-1 - step));
    }
    await hidden();
    await page.screenshot({ path: `${out}/${touch ? "mobile" : "desktop"}-restored.png` });
    evidence.push({ mode: touch ? "mobile" : "desktop", before, target, reverseSteps: 5, errors });
    console.log(
      `PASS ${touch ? "mobile" : "desktop"}: wrong PIN/cancel, masked digits, exact five reverse states and score`,
    );

    await click("[data-pause]");
    assert.equal((await read()).paused, true);
    await open();
    if (touch) {
      await page.setViewportSize({ width: 844, height: 390 });
      await fit();
      await page.screenshot({ path: `${out}/mobile-landscape-pin.png` });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await enter();
    await closed();
    await settled();
    assert.deepEqual(state(await read()), snapshots[2]);
    assert.equal((await read()).paused, true, "previous pause is preserved");
    await click("[data-pause]");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open();
    await enter();
    await closed();
    assert.deepEqual(state(await read()), snapshots[0], "fewer than five moves stops at the start");
    assert.equal((await read()).historyDepth, 0);
    assert.equal((await read()).playback, null);
    await open();
    await click("[data-cancel]");
    await closed();
    assert.deepEqual(state(await read()), snapshots[0]);
    await move("ArrowDown");
    await click("[data-restart]");
    assert.equal((await read()).historyDepth, 0, "restart discards history");
    assert.equal((await read()).moves, 0);
    await open();
    const restarted = state(await read());
    await enter();
    await closed();
    assert.deepEqual(state(await read()), restarted, "new round cannot restore an old board");
    console.log(
      `PASS ${touch ? "mobile" : "desktop"}: repeated gate, pause, reduced motion, short history, restart`,
    );

    if (!touch) {
      const terminal = [state(await read())];
      for (let i = 0; !(await read()).over && i < 500; i++) {
        const current = await read();
        const options = keys
          .map((key) => {
            const vertical = key === "ArrowUp" || key === "ArrowDown";
            const reverse = key === "ArrowDown" || key === "ArrowRight";
            const board = current.board.map((row) => row.slice());
            let score = 0;
            for (let n = 0; n < 4; n++) {
              let line = Array.from({ length: 4 }, (_, m) =>
                vertical ? board[m][n] : board[n][m],
              );
              if (reverse) line.reverse();
              const merged = mergeLine(line);
              score += merged.score;
              line = merged.line;
              if (reverse) line.reverse();
              for (let m = 0; m < 4; m++)
                if (vertical) board[m][n] = line[m];
                else board[n][m] = line[m];
            }
            return { key, board, score, occupied: board.flat().filter(Boolean).length };
          })
          .filter((o) => JSON.stringify(o.board) !== JSON.stringify(current.board));
        options.sort((a, b) => b.occupied - a.occupied || a.score - b.score);
        assert.ok(options.length);
        const s = await move(options[0].key);
        terminal.push(state(s));
      }
      assert.equal((await read()).over, true, "real keyboard play reaches a terminal board");
      await page.locator(".arcade-result:not([hidden])").waitFor();
      await open();
      await enter();
      await closed();
      assert.deepEqual(state(await read()), terminal.at(-6));
      assert.equal(await page.locator(".arcade-result:visible").count(), 0);
      const count = (await read()).moves;
      for (const key of keys) {
        const s = await move(key);
        if (s.moves > count) break;
      }
      assert.ok((await read()).moves > count, "play resumes after recovering from game over");
      console.log("PASS game-over recovery and resumed real keyboard play");
    }
    assert.deepEqual(errors, []);
  } catch (e) {
    await page.screenshot({ path: `${out}/${touch ? "mobile" : "desktop"}-failure.png` });
    console.error("Browser errors", errors);
    throw e;
  } finally {
    await context.close();
  }
}

try {
  await check();
  await check(true);
  await writeFile(`${out}/evidence.json`, JSON.stringify({ origin, evidence }, null, 2));
  console.log(`PASS hidden administrator shortcut; artifacts: ${out}`);
} finally {
  await browser.close();
  await server?.close();
}
