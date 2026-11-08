import fs from "node:fs";
import path from "node:path";

const proofDir = process.env.PROOF_DIR ?? "output/client-proof-50-games-2026-10-28";
const baseUrl = process.env.PROOF_BASE_URL ?? "http://localhost:8081";
const debugPort = process.env.PROOF_DEBUG_PORT ?? "9224";
const fixture = JSON.parse(fs.readFileSync(path.join(proofDir, "fixture.json"), "utf8"));
const screenshotsDir = path.join(proofDir, "screenshots");
fs.mkdirSync(screenshotsDir, { recursive: true });

const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = tabs.find((tab) => tab.type === "page");
if (!page) throw new Error("No browser page found on the Chrome debugging port");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let sequence = 0;
let current = null;
const pending = new Map();

ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request?.reject(new Error(message.error.message));
    else request?.resolve(message.result);
    return;
  }
  if (!current) return;
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params.exceptionDetails;
    current.exceptions.push(details.exception?.description ?? details.text);
  }
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
    current.httpErrors.push({
      status: message.params.response.status,
      url: message.params.response.url,
    });
  }
};

await new Promise((resolve) => {
  ws.onopen = resolve;
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression) => {
  const response = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  }
  return response.result.value;
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(expression, timeout = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

await send("Network.enable");
await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: fixture.viewport.width,
  height: fixture.viewport.height,
  deviceScaleFactor: fixture.viewport.deviceScaleFactor,
  mobile: true,
  screenWidth: fixture.viewport.width,
  screenHeight: fixture.viewport.height,
});
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Network.setUserAgentOverride", {
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36",
  platform: "Android",
});
await send("Network.setCookie", {
  name: "mh_session",
  value: fixture.token,
  url: `${baseUrl}/`,
  sameSite: "Lax",
});

const results = [];

for (let index = 0; index < fixture.games.length; index += 1) {
  const game = fixture.games[index];
  current = {
    order: index + 1,
    id: game.id,
    name: game.name,
    screenshot: `screenshots/${String(index + 1).padStart(2, "0")}-${game.id}.png`,
    viewport: fixture.viewport,
    exceptions: [],
    httpErrors: [],
  };

  try {
    await send("Page.navigate", { url: `${baseUrl}/?proof=${encodeURIComponent(game.id)}` });
    await waitFor("document.readyState === 'complete'");
    const card = `[...document.querySelectorAll('button[aria-label^="Play "]')].find((button) => button.getAttribute('aria-label') === ${JSON.stringify(`Play ${game.name}`)})`;
    await waitFor(`!!(${card})`);
    await evaluate(`(${card}).scrollIntoView({block:'center'}); (${card}).click()`);
    await waitFor(
      `[...document.querySelectorAll('[role="dialog"] button')].some((button) => /play now/i.test(button.innerText))`,
    );
    await evaluate(
      `[...document.querySelectorAll('[role="dialog"] button')].find((button) => /play now/i.test(button.innerText)).click()`,
    );

    const spin = `[...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === 'Spin' || /^spin$/i.test(button.innerText.trim()))`;
    await waitFor(`!!(${spin}) && !(${spin}).disabled`, 60_000);
    await sleep(1_250);

    current.layout = await evaluate(`(() => {
      const viewport = { width: innerWidth, height: innerHeight };
      const root = document.documentElement;
      const spin = ${spin};
      const spinRect = spin?.getBoundingClientRect();
      const visible = (rect) => !!rect && rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1;
      return {
        viewport,
        documentWidth: root.scrollWidth,
        documentHeight: root.scrollHeight,
        horizontalOverflow: root.scrollWidth > innerWidth + 1,
        spin: spinRect ? { x: spinRect.x, y: spinRect.y, width: spinRect.width, height: spinRect.height } : null,
        spinVisible: visible(spinRect),
        bodyText: document.body.innerText.slice(-500),
      };
    })()`);

    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    fs.writeFileSync(path.join(proofDir, current.screenshot), Buffer.from(screenshot.data, "base64"));

    current.pass =
      !current.layout.horizontalOverflow &&
      current.layout.spinVisible &&
      current.exceptions.length === 0 &&
      current.httpErrors.length === 0;
    if (!current.pass) current.failure = "Layout, console, or network validation failed";
  } catch (error) {
    current.pass = false;
    current.failure = error instanceof Error ? error.message : String(error);
  }

  results.push(current);
  fs.writeFileSync(path.join(proofDir, "results.json"), JSON.stringify(results, null, 2));
  console.log(`${current.pass ? "PASS" : "FAIL"} ${String(index + 1).padStart(2, "0")}/50 ${game.id}`);
}

ws.close();
console.log(
  JSON.stringify({
    tested: results.length,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
  }),
);
