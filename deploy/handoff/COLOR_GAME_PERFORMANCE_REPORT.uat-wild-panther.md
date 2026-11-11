# Color Game / Color Game Pro - wheel performance report

Status: changes made LOCALLY and committed (22d37cc); not deployed. **The reported Android lag was NOT reproduced in my environment, so the fix is unproven on real devices.**

## Method
`scripts/qa/browser-colorgame-perf.mjs`: headless Chromium (software rendering, no real GPU) against the app on loopback; logs every `requestAnimationFrame` timestamp during one real spin; viewports desktop 1280x800 and Android-like 360x780 @2.75 DPR with CPU throttling 4x and 6x (Chrome DevTools `Emulation.setCPUThrottlingRate`). One authenticated spin per scenario; Pro measured twice. Raw JSON: `maxhigh-evidence\colorgame-perf\`.
Software rendering makes GPU-heavy effects look *worse* than a phone GPU and cannot show real low-end Android GPU limits. Use as before/after comparison only.

## What the code already did right (so it was not the cause)
Time-based animation (`performance.now()`), one `requestAnimationFrame` loop, rotation written straight to `transform` via a ref (no React state per frame), server result obtained *before* the visual spin (outcome and settlement are server-authoritative and independent of the animation).

## Suspected causes found and changes made
| Suspect | Change |
|---|---|
| Per-peg pointer flapper rewrote inline `transition` + nested `requestAnimationFrame` on every slice (many per second at high speed) | Web Animations API (`element.animate`), off-main-thread, no style thrash |
| Bulbs animated `filter: brightness` (main-thread repaint, 0.18 s during spin) | opacity-only keyframes |
| `mix-blend-mode: overlay` on the rotating winning slice (backdrop readback) | removed |
| Pro: blurred aurora (26px blur) + `backdrop-filter` glass/dock repainting under the moving wheel | paused / disabled **while spinning** (`pro-spinning` class) |
| Backgrounded tab: rAF paused, round visuals could hang | settle fallback timer (duration + 1.5 s); animation position is time-derived so no jumps on return |
| Reduced motion | `prefers-reduced-motion` -> one gentle 1.2 s turn |
| Tried and **reverted** | `will-change: transform` on the aurora layers made desktop Pro *worse* (52 -> 33 fps) in software compositing; removed |

## Results (avg fps / p99 frame ms / worst frame ms / frames >33 ms), before -> after
| Game | Scenario | avg fps | p99 ms | worst ms | >33 ms |
|---|---|---|---|---|---|
| Color Game | desktop | 59.1 -> 60.0 | 33.3 -> 16.8 | 33.4 -> 16.8 | 1 -> 0 |
| Color Game | 360px, CPU 4x | 58.9 -> 59.9 | 33.3 -> 16.8 | 50 -> 33.4 | 2 -> 0 |
| Color Game | 360px, CPU 6x | 59.5 -> 59.2 | 16.8 -> 33.3 | 33.4 -> 49.9 | 0 -> 1 |
| Color Game Pro | desktop | 44.8 -> 52.9 / 51.5 | 50 -> 33.4 | 50.1 -> 50 | 18 -> 10 |
| Color Game Pro | 360px, CPU 4x | 59.4 -> 58.3 / 59.2 | 33.3 -> 33.3 | 33.4 -> 33.4 | 0 -> 1 / 2 |
| Color Game Pro | 360px, CPU 6x | 50.1 -> 53.9 / 49.3 | 33.4 -> 33.4 | 66.7 -> 50 / 66.7 | 9 -> 8 / 7 |

Interpretation: Color Game was already ~59 fps here and is unchanged within noise; Pro desktop improved ~7-8 fps with fewer slow frames; throttled-phone Pro is within run-to-run noise. No regression remained after reverting `will-change`. (The first "after" Color Game run overlapped a CPU-heavy unit test; its numbers are the least reliable.)

## Not verified
Real Android Chrome on a low-end GPU; frame pacing with real touch input; pointer/wheel alignment at the final frame was not measured numerically (final angle is set exactly to the target slice by construction); tab-visibility recovery was reasoned from the time-based loop and the fallback timer, not driven by an automated test.

## Recommended next step
Measure on a real mid/low-end Android phone with Chrome remote debugging (Performance panel, "Frames" track) and the same spin; if jank persists, profile paint/composite cost of the bulbs ring and the conic-gradient disc (rasterisation at DPR 3).
