# Game splash screens — 2026-11-02

The original 50 games now open with immersive game splash screens. This replaces the earlier editorial design after the user's feedback that it looked like a website.

- Large title artwork blended into a full-screen atmospheric backdrop.
- Animated sparks for slots, diamonds for card games, and bubbles for fishing.
- A compact glowing loading bar, short status text, and a corner back control.
- No promotional headings, split columns, numbered setup steps, or page-style header/footer.
- Per-game cover artwork and accent colors remain distinct.
- Existing readiness gates, error recovery, missing-art fallback, and reduced-motion support are preserved.

The component reuses the project's redesigned artwork; no new image generation was required.

## Verification

All 50 themes passed browser checks with zero missing images and zero horizontal overflow. Ready, slow-loading, missing-art, error-boundary, return-to-lobby, and reduced-motion checks passed. Additional sizes: 320×568, 844×390, and 1280×800. TypeScript and ESLint on the changed component passed.

Production build passed. A real signed-in Fortune Rabbit launch displayed the splash and transitioned into its game view successfully; no bets were placed. [Live launch result](../output/loading-screen-review/live-launch.json).

[Browser results](../output/loading-screen-review/verification.json)

![Fortune Rabbit splash](../output/loading-screen-review/fortune-rabbit-mobile.png)

![Fire Spike splash](../output/loading-screen-review/fire-spike-mobile.png)

![Cleopatra desktop splash](../output/loading-screen-review/cleopatra-1280x800.png)
