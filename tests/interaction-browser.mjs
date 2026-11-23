import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { staticServer } from "./ai-lab-server.mjs";
import { loadCatalog } from "../backend/catalog.mjs";
import { LivingNavigation } from "../shared/living-navigation.mjs";

const out = process.env.INTERACTION_ARTIFACTS || "/private/tmp/xiangmeta-interactions";
await mkdir(out, { recursive: true });
const server = process.env.INTERACTION_ORIGIN ? null : await staticServer(),
  origin = process.env.INTERACTION_ORIGIN || server.origin,
  browser = await chromium.launch({
    headless: true,
    args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
  }),
  catalog = (await loadCatalog(process.cwd())).public,
  results = [];
try {
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1440, height: 1000 } }],
    ["phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ["landscape", { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
  ]) {
    if (process.env.INTERACTION_VIEW && process.env.INTERACTION_VIEW !== name) continue;
    const context = await browser.newContext(options),
      page = await context.newPage(),
      errors = [];
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" || /GL_INVALID|INVALID_OPERATION|WebGL.*warning/i.test(m.text()))
        errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    const inspect = () => page.evaluate(() => window.__xiangmetaInspect());
    const look = async (p, t, angle = 0) => {
      await page.evaluate(
        ({ p, t, angle }) => {
          const dx = t.x - p.x,
            dz = t.z - p.z,
            a = (angle * Math.PI) / 180;
          window.__xiangmetaWalk(
            p.x,
            p.z,
            p.x + dx * Math.cos(a) - dz * Math.sin(a),
            p.z + dx * Math.sin(a) + dz * Math.cos(a),
          );
        },
        { p, t, angle },
      );
    };
    const hint = page.locator("#interaction-prompt");
    const notShown = async (text) => {
      await page.waitForFunction(
        (text) =>
          document.querySelector("#interaction-prompt:not([hidden]) b")?.textContent !== text,
        text,
      );
      assert.ok((await page.locator(".interaction-prompt:visible").count()) <= 1);
    };
    const shown = async (text) => {
      try {
        await page.waitForFunction(
          (text) =>
            document.querySelector("#interaction-prompt:not([hidden]) b")?.textContent === text,
          text,
        );
      } catch (error) {
        await writeFile(
          `${out}/${name}-failure.json`,
          JSON.stringify(
            {
              expected: text,
              hint: await hint.innerText(),
              state: await inspect(),
            },
            null,
            2,
          ),
        );
        await page.screenshot({ path: `${out}/${name}-failure.png` });
        throw error;
      }
      assert.equal(await page.locator(".interaction-prompt:visible").count(), 1);
      const box = await hint.boundingBox();
      assert.ok(box.height <= (name === "desktop" ? 65 : 100), `${text}: compact height`);
      assert.ok(box.x >= 0 && box.x + box.width <= options.viewport.width);
      if (name !== "desktop") {
        for (const control of ["#touch-joystick", "#touch-jump"]) {
          const b = await page.locator(control).boundingBox();
          assert.ok(
            box.y + box.height + 6 < b.y ||
              box.x + box.width + 6 < b.x ||
              box.x > b.x + b.width + 6,
            `${text}: ${control} clearance`,
          );
        }
      }
    };
    await page.goto(origin + "/world/?project=xianglm&inspect");
    await page.locator("#world-loading").waitFor({ state: "hidden", timeout: 90000 });
    await shown("XiangLM");
    assert.equal(
      await page
        .locator(
          ".controls-pill,.guide-card,#nearby,#memory-prompt,#discovery-prompt,.game-near-prompt",
        )
        .count(),
      0,
    );
    let state = await inspect();
    const station = state.stations.find((s) => s.id === "xianglm");
    await look(station.approach, station, 25);
    await shown("XiangLM");
    await look(station.approach, station, 180);
    await hint.waitFor({ state: "hidden" });
    await look(station.approach, station);
    await shown("XiangLM");
    // 用实际拖动验证俯仰角参与判断。
    const canvas = await page.locator("#world canvas").boundingBox();
    for (let i = 0; i < 2; i++) {
      const x = canvas.x + canvas.width * 0.72,
        y = Math.min(options.viewport.height - 75, canvas.y + canvas.height * 0.78);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, Math.max(canvas.y + 20, y - 270), { steps: 4 });
      await page.mouse.up();
    }
    try {
      await hint.waitFor({ state: "hidden" });
    } catch (error) {
      await writeFile(
        `${out}/${name}-pitch-failure.json`,
        JSON.stringify(
          {
            hint: await hint.innerText(),
            state: await inspect(),
          },
          null,
          2,
        ),
      );
      await page.screenshot({ path: `${out}/${name}-pitch-failure.png` });
      throw error;
    }
    await look({ x: 5.4, z: 5.4 }, station);
    await hint.waitFor({ state: "hidden" });
    await page.screenshot({ path: `${out}/${name}-clear.png` });
    await look(station.approach, station);
    await shown("XiangLM");
    await page.screenshot({ path: `${out}/${name}-station.png` });

    const nav = new LivingNavigation(catalog.regions, state.obstacles);
    const approach = async (target, distance, checkSight = true) => {
      state = await inspect();
      const dynamic = [...state.living.items.filter((i) => !i.held), ...state.living.animals];
      const p = Array.from({ length: 48 }, (_, i) => {
        const a = (i * Math.PI) / 24;
        return { x: target.x + Math.sin(a) * distance, z: target.z + Math.cos(a) * distance };
      }).find(
        (p) =>
          nav.ground(p.x, p.z, 0.36, null, dynamic) !== null &&
          (!checkSight ||
            nav.sight({ ...p, y: (target.y ?? 0) + 0.5 }, { ...target, y: (target.y ?? 0) + 0.5 })),
      );
      assert.ok(p, "safe target approach");
      await look(p, target);
      return p;
    };
    const item = state.living.items.find((i) => i.kind === "conch");
    const itemApproach = await approach(item, item.radius + 1.15);
    await shown(item.name);
    await look(itemApproach, item, 180);
    await notShown(item.name);
    await look(itemApproach, item, 12);
    await shown(item.name);
    await page.locator('[data-living-key="Q"]').click();
    await page.waitForFunction(() => window.__xiangmetaInspect().living.carried !== null);
    await page.locator('[data-living-key="Q"]:not([disabled])').waitFor();
    await page.locator('[data-living-key="Q"]').click();
    await page.waitForFunction(() => window.__xiangmetaInspect().living.carried === null);
    const animal = (await inspect()).living.animals.find((a) => a.kind === "polar-bear" && a.ride);
    const animalApproach = await approach(animal, animal.radius + 1.1);
    await shown(animal.name);
    await look(animalApproach, animal, 180);
    await notShown(animal.name);
    await look(animalApproach, animal);
    await shown(animal.name);
    await page.locator('[data-living-key="Q"]').click();
    await page.waitForFunction(() => window.__xiangmetaInspect().living.hearts > 0);
    await page.locator('[data-living-key="T"]').click();
    await page.waitForFunction(() => window.__xiangmetaInspect().living.mounted === "polar-bear");
    await page.locator('[data-living-key="T"]:not([disabled])').click();
    await page.waitForFunction(() => window.__xiangmetaInspect().living.mounted === null);
    const stall = state.games.stalls[0];
    await look(stall.approach, stall);
    await shown(stall.name);
    await look(stall.approach, stall, 180);
    await notShown(stall.name);
    await look(stall.approach, stall, 20);
    await shown(stall.name);
    await page.locator('[data-context-key="V"]').click();
    await page.locator(`[data-stall-page="${stall.id}"]`).waitFor();
    await page.keyboard.press("Escape");

    const work = state.artworks[0];
    await look(work.approach, work, 15);
    await shown(work.label);
    await page.screenshot({ path: `${out}/${name}-artwork.png` });
    await look(work.approach, work, 180);
    await notShown(work.label);
    const wonder = state.discoveries.find((d) => d.kind === "chimes");
    const wonderApproach = await approach(wonder, 2.1, false);
    await shown(wonder.title);
    await look(wonderApproach, wonder, 180);
    await notShown(wonder.title);
    await look(wonderApproach, wonder);
    await shown(wonder.title);
    await page.locator('[data-context-key="G"]').click();
    assert.deepEqual(errors, []);
    results.push({
      name,
      checks: [
        "near + gaze",
        "generous aim",
        "pitch",
        "clear movement",
        "small object pickup/drop",
        "animal pet/mount/dismount",
        "game modal",
        "artwork",
        "discovery",
        "touch clearance",
      ],
      errors,
    });
    console.log(name, "passed");
    await context.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ origin, results }, null, 2));
} finally {
  await browser.close();
  await server?.close();
}
