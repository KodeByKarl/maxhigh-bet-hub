// QA-only: mounts the REAL game entry point (src/games/<id>/GameView) in the real stylesheet. Auth and server functions are stubbed
// (see vite.config.mjs), so no login, database or wallet is needed. `?game=<id>`; `window.__games()` lists every id.
import "@/styles.css";
import { Suspense, createElement } from "react";
import { createRoot } from "react-dom/client";
import { GAME_VIEW_LOADERS } from "@/games/registry";
import { lazy } from "react";

(window as unknown as { __games: () => string[] }).__games = () => Object.keys(GAME_VIEW_LOADERS);
const id = new URLSearchParams(location.search).get("game") ?? "zeus-strike";
const loader = GAME_VIEW_LOADERS[id];
const View = lazy(async () => ({ default: (await loader()).GameView }));
createRoot(document.getElementById("root")!).render(
  <div style={{ height: "100dvh", width: "100vw" }} data-harness-game={id}>
    <Suspense fallback={null}>{createElement(View, { gameId: id })}</Suspense>
  </div>,
);

// `?legacy=1` switches the presentation skin off (before-screenshots): the skin is attribute-driven, so removing the attributes restores
// the original look of the unchanged game shell.
if (new URLSearchParams(location.search).get("legacy")) {
  const strip = () =>
    document.querySelectorAll("[data-game-view]").forEach((el) => {
      for (const a of [
        "data-game-view",
        "data-frame",
        "data-deck",
        "data-voice",
        "data-spin",
        "data-fx",
      ])
        el.removeAttribute(a);
    });
  setInterval(strip, 150);
}
