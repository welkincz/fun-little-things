/**
 * Render mortgage/og/template.html to mortgage/public/og.png (1200×627).
 *
 * Uses system Chrome so the latin variable Fraunces and Inter files in
 * mortgage/og/fonts/ are the same faces the page sets (Fraunces display,
 * Inter UI). Those woff2 files are the Google Fonts latin subsets, SIL OFL.
 *
 *   node scripts/render-og.mjs
 *
 * Not part of `npm run build`. The PNG is committed; rerun this when the
 * template changes.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WIDTH = 1200;
const HEIGHT = 627;
const MAX_BYTES = 300 * 1024;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "og", "template.html");
const outPath = path.join(root, "public", "og.png");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDebugger(port) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error("Chrome DevTools did not open");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.next = 0;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message || "CDP error"}`));
      else resolve(message.result ?? {});
    });
  }

  send(method, params = {}) {
    const id = ++this.next;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }
}

const port = 9333;
const userData = mkdtempSync(path.join(tmpdir(), "mortgage-og-"));
const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let chromeLog = "";
chrome.stderr.on("data", (chunk) => {
  chromeLog += chunk.toString();
});

try {
  await waitForDebugger(port);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("Chrome did not open a page target");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("DevTools socket failed")), { once: true });
  });
  const cdp = new Cdp(ws);

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send("Page.enable");
  await cdp.send("Page.navigate", { url: `file://${htmlPath}` });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    const { result } = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    });
    if (result?.value === "complete") {
      ready = true;
      break;
    }
    await sleep(40);
  }
  if (!ready) throw new Error("Share image document did not finish loading");

  const fonts = await cdp.send("Runtime.evaluate", {
    expression: `document.fonts.ready.then(() => ({
      fraunces: document.fonts.check("500 108px Fraunces"),
      inter: document.fonts.check("500 26px Inter"),
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }))`,
    awaitPromise: true,
    returnByValue: true,
  });
  const face = fonts.result?.value;
  if (!face?.fraunces || !face?.inter) {
    throw new Error(`Fraunces or Inter did not load: ${JSON.stringify(face)}`);
  }
  if (face.width !== WIDTH || face.height !== HEIGHT) {
    throw new Error(`Viewport is ${face.width}×${face.height}, expected ${WIDTH}×${HEIGHT}`);
  }

  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
  });
  const png = Buffer.from(shot.data, "base64");
  if (png.length < 24 || png.readUInt32BE(16) !== WIDTH || png.readUInt32BE(20) !== HEIGHT) {
    throw new Error(`Screenshot is not ${WIDTH}×${HEIGHT}`);
  }
  if (png.length >= MAX_BYTES) {
    throw new Error(`og.png is ${png.length} bytes, limit is ${MAX_BYTES}`);
  }
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes, ${WIDTH}×${HEIGHT})`);
  ws.close();
} catch (error) {
  if (chromeLog.trim()) console.error(chromeLog.trim());
  throw error;
} finally {
  chrome.kill("SIGKILL");
  rmSync(userData, { recursive: true, force: true });
}
