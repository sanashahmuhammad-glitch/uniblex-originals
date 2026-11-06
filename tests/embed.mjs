import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { games } from "../games.js";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = [];
for (const game of games.filter((game) => !process.env.QA_GAME || game.id === process.env.QA_GAME)) for (const mobile of [false, true]) {
  const viewport = game.aspect === "9/16" ? mobile ? { width: 390, height: 693 } : { width: 420, height: 747 }
    : game.aspect === "1/1" ? mobile ? { width: 390, height: 390 } : { width: 640, height: 640 }
      : mobile ? { width: 390, height: 219 } : { width: 960, height: 540 };
  const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const response = await page.goto(`http://127.0.0.1:4173/play.html?g=${game.id}&embed=1`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator(".play-top:visible, .help-line:visible").count(), 0);
    await page.locator(".primary-button").click();
    const result = await page.evaluate(() => {
      const stage = document.querySelector(".game-stage").getBoundingClientRect();
      const board = document.querySelector(".board")?.getBoundingClientRect();
      return {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        stage: stage.toJSON(), board: board?.toJSON(),
        surface: document.querySelectorAll(".game-stage canvas, .game-stage .board").length
      };
    });
    assert.equal(result.surface, 1);
    assert.ok(result.width <= viewport.width + 1 && result.height <= viewport.height + 1, "embedded page overflows");
    assert.ok(Math.abs(result.stage.width - viewport.width) < 2 && Math.abs(result.stage.height - viewport.height) < 2, "stage does not fill iframe");
    if (result.board) {
      assert.ok(result.board.left >= -1 && result.board.right <= viewport.width + 1, "board clipped horizontally");
      assert.ok(result.board.top >= 35 && result.board.bottom <= viewport.height - 35, `board behind HUD or controls: ${JSON.stringify(result.board)}`);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS embed ${game.id} ${mobile ? "mobile" : "desktop"}`);
  } catch (error) {
    failures.push(`${game.id} ${mobile ? "mobile" : "desktop"}: ${error.message}`);
    console.error(`FAIL ${failures.at(-1)}`);
  } finally { await page.close(); }
}
await browser.close();
if (failures.length) process.exitCode = 1;
