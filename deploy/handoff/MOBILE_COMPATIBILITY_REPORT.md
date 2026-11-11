# Mobile compatibility report (browser emulation only)

**No physical Android device was used.** Everything below is headless Chromium emulation (viewport, device pixel ratio, touch, CPU throttling and CDP-emulated safe-area insets). `PENDING PHYSICAL ANDROID VALIDATION`.

## 1. Lobby and pages - 35/35 checks pass
/, /slots, /fishing, /cards, /support at 320x640, 360x780, 390x844, 412x915, 430x932 (portrait), 915x412 (landscape) and 800x1280 (tablet): no horizontal scrolling, no console errors, no touch target under 32 px. Desktop + mobile smoke: 48/48.

## 2. In-game layouts with emulated system insets - final audit
Insets: portrait top 28 / bottom 34 px; landscape sides 40 px, bottom 21 px (typical cutout + gesture bar). Games opened at 320x640, 360x780, 412x915, 667x375, 780x360, 915x412. Probe: `scripts/qa/browser-ingame-mobile.mjs` (judges only static controls inside the game shell; moving targets are counted and set aside).
* **Clean at every viewport:** Golden Panther, Wild Panther, Color Game, Color Game Pro, Baccarat, Abyssal Pearls, Coin Volcano, Coral Cobra, Fire Spike.
* **Deep Bass:** two fish multiplier labels sit in the landscape side margins at the sampling instant. They belong to fish that swim in from beyond the arena edge (14-15 other fish were moving and set aside). Judged **not a layout defect**; remains a visual check on a device.
* Fixes made: the game shell pads by `env(safe-area-inset-*)` on all four sides; the in-game Close button is offset by the insets; Wild Panther's root used `h-dvh` (100% of the viewport) inside the padded shell and overflowed it by the inset total - now `h-full`. A first attempt that only removed padding made portrait worse (controls 28 px inside the 34 px zone) and was corrected; the audit caught it.
* In a normal Android Chrome tab the system bars are outside the page viewport and insets are 0 (no change in behaviour); the insets matter for fullscreen/PWA use, landscape cutouts and gesture-bar devices.

## 3. Back button and history (browser level) - 10/10 checks
Back closes the info dialog, then the game, and returns to the lobby without leaving the page; the on-screen X leaves no ghost history entry (the next Back goes to the previous page); Back is absorbed while a spin/deal request is in flight and works again after it completes. Implementation: `src/lib/overlay-history.ts`, `useOverlayBack.ts`, `round-guard.ts`.
**Limits:** this is browser history only. It cannot and does not alter Android's own navigation bar or gestures; it cannot detect an in-progress round that has no request in flight (for example free spins waiting for the player's next press) - those are safe because they are server-side sessions the player resumes. Home navigation uses the app's existing controls (no change).

## 4. Not covered
Physical devices (real GPUs, OEM browsers, gesture vs three-button navigation, display cutouts, virtual keyboard behaviour in login and amount fields), orientation change mid-round, PWA/fullscreen mode, the remaining ~90 games' in-game layouts at phone sizes (9 representative games were audited).
