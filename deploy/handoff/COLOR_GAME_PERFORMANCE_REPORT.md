# Color Game / Color Game Pro - wheel performance report (final)

**The reported Android lag was NOT reproduced.** This environment has no real GPU (software-rendered headless Chromium), so nothing here proves smoother wheels on a physical low/mid-range Android phone. What is established is below; physical-device measurement is still `PENDING PHYSICAL ANDROID VALIDATION`.

## Method
`scripts/qa/browser-colorgame-perf.mjs`, `browser-colorgame-ab.mjs`, `browser-colorgame-build-ab.mjs`: every `requestAnimationFrame` timestamp during one real spin, desktop 1280x800 and Android-like 360x780 @2.75 DPR with CDP CPU throttling (1x / 4x / 6x). Comparisons **alternate** runs (A,B,A,B...) so machine drift hits both equally. Raw data: `maxhigh-evidence\phase2\release-gates\colorgame-ab\` and `colorgame-build-ab\`.

## What the code already did right
Time-based animation (`performance.now()`), one rAF loop, rotation written straight to `transform` via a ref, server result obtained **before** the visual spin (outcome and settlement are server-authoritative and independent of the animation; no client-side outcome calculation).

## Head-to-head: original deployed build (2294d79) vs release (4 alternating runs each)
| Game | Scenario | Original | Release |
|---|---|---|---|
| Color Game | desktop | 60.0 fps | 60.0 fps |
| Color Game | 360px, CPU 6x | 59.5 fps | 59.3 fps |
| Color Game Pro | desktop | 47.0 fps (range 42.6-49.5; slow frames 10.5) | **54.7 fps (range 53.0-55.8; slow frames 4.3)** |
| Color Game Pro | 360px, CPU 6x | 53.5 fps | 53.9 fps (no difference) |

## CSS A/B on the release build (5 alternating runs each)
Pausing the blurred aurora and disabling `backdrop-filter` glass **while the wheel spins** vs the same page with that CSS neutralised: desktop 54.0 vs 48.4 fps (ranges 52.4-55.1 vs 44.7-49.5, **non-overlapping**), slow frames 5.8 vs 13.6; at 6x CPU 56.8 vs 55.2 fps (ranges overlap: directional only).

## Decision (only repeatable measurements are kept)
| Change | Evidence | Decision |
|---|---|---|
| Pro: pause aurora / drop `backdrop-filter` while spinning | repeatable desktop gain | **KEPT** |
| Reduced-motion handling (one gentle 1.2 s turn) | accessibility / correctness, not a performance claim | **KEPT** |
| Settle fallback when a tab is hidden (visuals finish after duration + 1.5 s, no hung round) | correctness | **KEPT** |
| Web Animations pointer flapper | no measurable difference | **REVERTED** |
| Remove `mix-blend-mode` on the winning slice | no measurable difference | **REVERTED** |
| Bulb `filter` animation -> opacity | no measurable difference | **REVERTED** |
| `will-change: transform` on the aurora layers | made desktop Pro **worse** (52 -> 33 fps) | removed earlier, never shipped |
Color Game (non-Pro) was already ~60 fps in the emulated environment and is unchanged in behaviour apart from reduced-motion and hidden-tab handling.

## Not verified / open
Real Android Chrome on low-end GPUs; frame pacing under real touch input; the final-frame wheel/pointer alignment (the final angle is set exactly to the target slice by construction, not measured numerically); automated hidden-tab recovery (reasoned from the time-based loop and covered by the fallback timer).
Recommended: Chrome remote debugging on a physical phone (Performance panel, Frames track) with the same spin; if jank persists profile paint/composite cost of the bulb ring and the conic-gradient disc at DPR 3.
