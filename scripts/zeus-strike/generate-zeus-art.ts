/**
 * Procedural Olympus art for Zeus Strike (replaces the old underwater/letter set).
 *
 *   npx tsx scripts/zeus-strike/generate-zeus-art.ts
 *   npx tsx scripts/zeus-strike/generate-zeus-art.ts --sheet     (also writes a review sheet)
 *
 * Output (same file names the Panther theme loader already uses):
 *   public/images/symbols/zeus-strike/{10,J,Q,K,A}.png        low pays  → laurel, amphora, lyre, helm, column
 *   public/images/symbols/zeus-strike/premium-{a,b,c}.png     eagle, Parthenon, Zeus
 *   public/images/symbols/zeus-strike/{scatter,wild}.png      Olympus medallion, thunderbolt
 *   public/images/symbols/zeus-strike/{backdrop,loading-bg}.webp   1280×720 storm over Olympus
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "public/images/symbols/zeus-strike");
const SHEET = path.join(os.tmpdir(), "zeus-art-sheet.png");

/* ───────────────────────── shared defs ───────────────────────── */
const DEFS = `
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fff6c2"/><stop offset=".28" stop-color="#f8cf4a"/>
  <stop offset=".62" stop-color="#c58a14"/><stop offset="1" stop-color="#6f4a07"/>
</linearGradient>
<linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#8a5a08"/><stop offset=".35" stop-color="#ffe27a"/>
  <stop offset=".6" stop-color="#e0a420"/><stop offset="1" stop-color="#7a4f06"/>
</linearGradient>
<linearGradient id="marble" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#dbe7f5"/><stop offset="1" stop-color="#9fb4cf"/>
</linearGradient>
<linearGradient id="marbleH" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#8ea3be"/><stop offset=".3" stop-color="#ffffff"/>
  <stop offset=".7" stop-color="#dfe9f6"/><stop offset="1" stop-color="#8396b0"/>
</linearGradient>
<linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffe0a0"/><stop offset=".4" stop-color="#d49a45"/><stop offset="1" stop-color="#6b4116"/>
</linearGradient>
<linearGradient id="clay" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#7a2e12"/><stop offset=".3" stop-color="#e2733a"/>
  <stop offset=".55" stop-color="#f09a5a"/><stop offset="1" stop-color="#6a2610"/>
</linearGradient>
<linearGradient id="storm" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#5a6ad8"/><stop offset=".5" stop-color="#2a2f86"/><stop offset="1" stop-color="#101340"/>
</linearGradient>
<radialGradient id="bolt" cx=".5" cy=".5" r=".5">
  <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".4" stop-color="#7dd3fc" stop-opacity=".7"/>
  <stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
</radialGradient>
<radialGradient id="aura" cx=".5" cy=".5" r=".5">
  <stop offset="0" stop-color="#9bd6ff" stop-opacity=".55"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
</radialGradient>
<filter id="ds" x="-20%" y="-20%" width="140%" height="150%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="6"/><feOffset dy="8" result="o"/>
  <feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer>
  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
  <feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="bevel" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
  <feDiffuseLighting in="blur" surfaceScale="7" diffuseConstant="1.05" lighting-color="#ffffff" result="diff">
    <feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting>
  <feComposite in="diff" in2="SourceAlpha" operator="in" result="diffIn"/>
  <feSpecularLighting in="blur" surfaceScale="7" specularConstant="1.0" specularExponent="26" lighting-color="#fff4cc" result="spec">
    <fePointLight x="-40" y="-70" z="200"/></feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
  <feComposite in="SourceGraphic" in2="diffIn" operator="arithmetic" k1="1.25" k2="0" k3="0" k4="0" result="lit"/>
  <feComposite in="lit" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.7" k4="0"/>
</filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0" result="g"/>
  <feComposite in="g" in2="SourceAlpha" operator="in" result="gi"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge>
</filter>
<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur20"><feGaussianBlur stdDeviation="20"/></filter>
`;

function sym(body: string, aura = true): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
<defs>${DEFS}</defs>
${aura ? `<circle cx="160" cy="165" r="150" fill="url(#aura)" opacity=".5"/>` : ""}
<g filter="url(#ds)"><g filter="url(#bevel)">${body}</g></g></svg>`;
}

const BOLT = "M178 18 L96 170 L150 170 L120 302 L228 128 L170 128 L206 18 Z";

/* ───────────────────────── low pays ───────────────────────── */
function laurel(): string {
  let leaves = "";
  const N = 11;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const ang = Math.PI * (0.62 + t * 1.0) * (side ? -1 : 1) + (side ? Math.PI : 0);
      const cx = 160 + Math.cos(ang) * 100 * (side ? -1 : 1) * (side ? -1 : 1);
      const a = side ? Math.PI - (0.62 + t * 1.0) * Math.PI : (0.62 + t * 1.0) * Math.PI;
      const x = 160 + Math.cos(a) * 98;
      const y = 160 + Math.sin(a) * 98;
      void cx;
      const rot = (a * 180) / Math.PI + (side ? -90 : 90);
      const s = 1 - t * 0.35;
      leaves += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(2)})">
        <path d="M0 -34 C22 -22 22 14 0 34 C-22 14 -22 -22 0 -34Z" fill="url(#gold)" stroke="#6f4a07" stroke-width="2.5"/>
        <path d="M0 -28 L0 28" stroke="#fff3b0" stroke-width="2" opacity=".8"/>
        <path d="M0 -10 L10 -18 M0 4 L11 -6 M0 18 L9 8 M0 -10 L-10 -18 M0 4 L-11 -6 M0 18 L-9 8" stroke="#7a4f06" stroke-width="1.6" opacity=".6"/>
      </g>`;
    }
  }
  return `${leaves}
  <path d="M104 262 C130 280 190 280 216 262 L228 300 C190 292 130 292 92 300 Z" fill="#c0262d" stroke="#6a0f14" stroke-width="3"/>
  <path d="M104 262 C130 280 190 280 216 262" fill="none" stroke="#ff8d8d" stroke-width="3" opacity=".7"/>
  <circle cx="160" cy="278" r="12" fill="url(#gold)" stroke="#6f4a07" stroke-width="3"/>
  <path d="${BOLT}" transform="translate(114 86) scale(.5)" fill="#7dd3fc" stroke="#fff" stroke-width="9" stroke-linejoin="round" filter="url(#glow)"/>`;
}

function amphora(): string {
  return `
  <path d="M86 110 C58 110 52 160 82 178 M234 110 C262 110 268 160 238 178" fill="none" stroke="#5a1f0c" stroke-width="22" stroke-linecap="round"/>
  <path d="M86 110 C58 110 52 160 82 178 M234 110 C262 110 268 160 238 178" fill="none" stroke="url(#clay)" stroke-width="14" stroke-linecap="round"/>
  <path d="M128 40 L192 40 C196 70 192 84 204 100 C240 124 248 176 226 218 C212 246 196 262 190 286 L130 286 C124 262 108 246 94 218 C72 176 80 124 116 100 C128 84 124 70 128 40Z" fill="url(#clay)" stroke="#4a1a0a" stroke-width="5"/>
  <ellipse cx="160" cy="40" rx="42" ry="13" fill="#f7a96a" stroke="#4a1a0a" stroke-width="5"/>
  <ellipse cx="160" cy="40" rx="30" ry="7" fill="#3a1408"/>
  <rect x="112" y="282" width="96" height="16" rx="6" fill="#8a3a18" stroke="#4a1a0a" stroke-width="4"/>
  <path d="M92 130 C130 142 190 142 228 130 L226 152 C190 164 130 164 94 152Z" fill="#1c0b05"/>
  <path d="M92 130 C130 142 190 142 228 130" fill="none" stroke="#ffd9a0" stroke-width="3" opacity=".7"/>
  <g stroke="#ffcf8a" stroke-width="4" fill="none" stroke-linecap="square" opacity=".95">
    <path d="M104 146 h14 v-8 h14 v8 h14 v-8 h14 v8 h14 v-8 h14 v8 h14 v-8 h14"/>
  </g>
  <path d="M110 190 C140 200 180 200 210 190 L204 214 C178 222 142 222 116 214Z" fill="#1c0b05"/>
  <g transform="translate(160 202)" fill="#ffcf8a"><circle cx="-34" cy="-2" r="5"/><path d="M-28 -2 L-10 -2 M-34 3 L-38 14 M-34 3 L-28 14"/><path d="M0 -8 L10 4 L-10 4Z"/><circle cx="34" cy="-2" r="5"/></g>
  <path d="M112 104 C100 150 106 210 130 270" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".28"/>`;
}

function lyre(): string {
  const strings = [140, 152, 164, 176, 188, 200]
    .map((x) => `<path d="M${x} 78 L${x} 238" stroke="#fff6c2" stroke-width="3" opacity=".95"/>`)
    .join("");
  return `
  <path d="M96 56 C70 100 80 170 106 214 L112 270 L208 270 L214 214 C240 170 250 100 224 56" fill="none" stroke="#5a3a06" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M96 56 C70 100 80 170 106 214 L112 270 L208 270 L214 214 C240 170 250 100 224 56" fill="none" stroke="url(#goldH)" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M96 56 C72 44 72 24 94 22 C108 24 108 40 96 46" fill="none" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>
  <path d="M224 56 C248 44 248 24 226 22 C212 24 212 40 224 46" fill="none" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>
  <rect x="98" y="66" width="124" height="16" rx="8" fill="url(#gold)" stroke="#5a3a06" stroke-width="4"/>
  ${strings}
  <path d="M112 232 L208 232 L214 276 L106 276Z" fill="url(#bronze)" stroke="#4a2a08" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="160" cy="252" rx="30" ry="10" fill="#2a1604" opacity=".85"/>
  <circle cx="132" cy="122" r="7" fill="#7dd3fc" stroke="#fff" stroke-width="2"/><circle cx="188" cy="122" r="7" fill="#7dd3fc" stroke="#fff" stroke-width="2"/>`;
}

function helmet(): string {
  return `
  <path d="M96 120 C100 40 220 40 224 120 L224 130 C236 120 252 100 248 70 C262 100 250 140 224 150 Z" fill="#9b1c24" stroke="#4a0a10" stroke-width="4" opacity=".0"/>
  <path d="M110 66 C96 24 140 6 160 14 C190 6 236 28 214 70 C194 54 126 54 110 66Z" fill="#c8202a" stroke="#6a0f14" stroke-width="5"/>
  <path d="M130 34 C150 24 180 24 200 36 M124 46 C150 36 186 36 210 50" fill="none" stroke="#ff9a9a" stroke-width="4" opacity=".7"/>
  <path d="M84 128 C84 66 124 52 160 52 C196 52 236 66 236 128 L236 188 C236 232 214 268 186 284 L176 284 L172 240 L148 240 L144 284 L134 284 C106 268 84 232 84 188Z" fill="url(#bronze)" stroke="#4a2a08" stroke-width="6" stroke-linejoin="round"/>
  <path d="M96 118 C100 92 124 70 160 70 C196 70 220 92 224 118" fill="none" stroke="#fff0c0" stroke-width="5" opacity=".55"/>
  <path d="M104 146 L142 150 L142 200 L112 196Z M216 146 L178 150 L178 200 L208 196Z" fill="#150c04" stroke="#4a2a08" stroke-width="4"/>
  <path d="M148 150 L172 150 L172 232 L148 232Z" fill="#150c04" opacity=".85"/>
  <path d="M96 100 L224 100" stroke="#ffe08a" stroke-width="8" stroke-linecap="round"/>
  <g fill="#ffe08a" stroke="#6f4a07" stroke-width="2"><circle cx="112" cy="100" r="5"/><circle cx="160" cy="100" r="5"/><circle cx="208" cy="100" r="5"/></g>
  <path d="M96 190 C98 238 116 262 140 280" fill="none" stroke="#fff0c0" stroke-width="6" opacity=".45"/>`;
}

function column(): string {
  const flutes = [112, 128, 144, 160, 176, 192, 208]
    .map((x) => `<path d="M${x} 112 L${x} 262" stroke="#8ea3be" stroke-width="3.2" opacity=".75"/>`)
    .join("");
  return `
  <path d="M60 300 L260 300 L260 270 L60 270Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="4"/>
  <path d="M82 270 L238 270 L238 252 L82 252Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="4"/>
  <path d="M104 252 L216 252 L210 112 L110 112Z" fill="url(#marbleH)" stroke="#5c6f8a" stroke-width="5"/>
  ${flutes}
  <path d="M64 82 L256 82 L256 108 L64 108Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="4"/>
  <path d="M96 108 C76 108 66 124 72 138 C78 150 98 150 100 134 C100 122 88 120 84 128" fill="none" stroke="#5c6f8a" stroke-width="6" stroke-linecap="round"/>
  <path d="M224 108 C244 108 254 124 248 138 C242 150 222 150 220 134 C220 122 232 120 236 128" fill="none" stroke="#5c6f8a" stroke-width="6" stroke-linecap="round"/>
  <path d="M96 108 L224 108 L218 124 L102 124Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="4"/>
  <path d="M50 60 L270 60 L270 84 L50 84Z" fill="url(#gold)" stroke="#6f4a07" stroke-width="5"/>
  <path d="M50 60 L160 28 L270 60Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="5"/>
  <path d="M160 40 L150 56 L160 52 L154 66 L170 50 L160 54 L168 42Z" fill="#fde047" stroke="#a16207" stroke-width="2"/>`;
}

/* ───────────────────────── premiums ───────────────────────── */
function eagle(): string {
  const feathers = (side: number) => {
    let o = "";
    for (let i = 0; i < 7; i++) {
      const a = (-70 + i * 17) * (Math.PI / 180);
      const len = (120 + Math.abs(3 - i) * -8 + 18) * 0.72;
      const x2 = 160 + side * (Math.cos(a) * len + 36);
      const y2 = 150 + Math.sin(a) * len * 0.8 + 20;
      o += `<path d="M${160 + side * 28} ${150 + i * 6} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#3a2406" stroke-width="30" stroke-linecap="round" opacity=".95"/>
            <path d="M${160 + side * 28} ${150 + i * 6} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="url(#gold)" stroke-width="22" stroke-linecap="round"/>
            <path d="M${160 + side * 32} ${150 + i * 6} L${(x2 - side * 6).toFixed(1)} ${(y2 - 4).toFixed(1)}" stroke="#fff3b0" stroke-width="3" opacity=".7" stroke-linecap="round"/>`;
    }
    return o;
  };
  return `${feathers(-1)}${feathers(1)}
  <path d="M104 210 C112 280 208 280 216 210 C226 150 198 96 160 96 C122 96 94 150 104 210Z" fill="#3a2410" stroke="#1d1004" stroke-width="5"/>
  <path d="M118 200 C130 262 190 262 202 200" fill="none" stroke="#7a5230" stroke-width="5" opacity=".7"/>
  <path d="M116 120 C110 70 150 44 186 60 C214 72 216 108 200 128 C186 110 150 102 116 120Z" fill="#f3f0e8" stroke="#6b6558" stroke-width="5"/>
  <path d="M130 62 C150 50 176 52 192 66" fill="none" stroke="#ffffff" stroke-width="5" opacity=".85"/>
  <path d="M190 74 C226 74 244 94 240 118 C230 122 214 114 204 100 C200 90 196 84 190 74Z" fill="url(#gold)" stroke="#6f4a07" stroke-width="5"/>
  <path d="M206 108 C220 116 232 114 240 118" fill="none" stroke="#6f4a07" stroke-width="3"/>
  <circle cx="170" cy="86" r="11" fill="#fff6c2" stroke="#6f4a07" stroke-width="4"/>
  <circle cx="172" cy="86" r="5.5" fill="#0b1220"/><circle cx="174" cy="84" r="1.8" fill="#fff"/>
  <path d="M158 74 L196 82" stroke="#3a2410" stroke-width="7" stroke-linecap="round"/>
  <path d="M148 150 L172 150 L160 178Z" fill="#fff6c2" opacity=".65"/>
  <path d="${BOLT}" transform="translate(120 190) scale(.28)" fill="#7dd3fc" stroke="#fff" stroke-width="10" filter="url(#glow)"/>`;
}

function temple(): string {
  const cols = [92, 128, 164, 200, 236]
    .map(
      (x) =>
        `<rect x="${x - 11}" y="134" width="22" height="116" fill="url(#marbleH)" stroke="#5c6f8a" stroke-width="3"/>
         <path d="M${x - 5} 138 L${x - 5} 248 M${x + 5} 138 L${x + 5} 248" stroke="#8ea3be" stroke-width="2"/>
         <rect x="${x - 15}" y="124" width="30" height="12" rx="3" fill="url(#marble)" stroke="#5c6f8a" stroke-width="3"/>
         <rect x="${x - 15}" y="248" width="30" height="10" rx="3" fill="url(#marble)" stroke="#5c6f8a" stroke-width="3"/>`,
    )
    .join("");
  return `
  <path d="M44 300 L276 300 L276 272 L44 272Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="4"/>
  <path d="M58 272 L262 272 L262 256 L58 256Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="4"/>
  ${cols}
  <rect x="64" y="108" width="192" height="20" fill="url(#gold)" stroke="#6f4a07" stroke-width="4"/>
  <path d="M52 108 L160 36 L268 108Z" fill="url(#marble)" stroke="#5c6f8a" stroke-width="5"/>
  <path d="M82 104 L160 54 L238 104Z" fill="#26307a" stroke="#5c6f8a" stroke-width="3"/>
  <path d="${BOLT}" transform="translate(132 58) scale(.2)" fill="#fde047" stroke="#fff" stroke-width="10" filter="url(#glow)"/>
  <g fill="url(#gold)" stroke="#6f4a07" stroke-width="2"><path d="M160 36 L152 48 L168 48Z"/><path d="M52 108 L60 98 L70 108Z"/><path d="M268 108 L260 98 L250 108Z"/></g>`;
}

function zeus(): string {
  const hair = [
    [100, 96, 30],
    [84, 124, 28],
    [78, 156, 26],
    [88, 188, 30],
    [110, 210, 30],
    [220, 96, 30],
    [236, 124, 28],
    [242, 156, 26],
    [232, 188, 30],
    [210, 210, 30],
    [130, 74, 30],
    [160, 66, 32],
    [190, 74, 30],
  ]
    .map(
      ([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#marble)" stroke="#8aa0bd" stroke-width="3"/>`,
    )
    .join("");
  const beard = [
    [112, 226, 26],
    [138, 250, 28],
    [168, 258, 28],
    [196, 248, 26],
    [214, 228, 24],
    [128, 216, 22],
    [160, 232, 26],
    [192, 216, 22],
  ]
    .map(
      ([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#marble)" stroke="#8aa0bd" stroke-width="3"/>`,
    )
    .join("");
  return `
  <path d="${BOLT}" transform="translate(170 14) scale(.62) rotate(14 120 160)" fill="#fde047" stroke="#fff" stroke-width="9" filter="url(#glow)"/>
  <path d="${BOLT}" transform="translate(30 20) scale(.5) rotate(-18 120 160)" fill="#7dd3fc" stroke="#fff" stroke-width="9" filter="url(#glow)"/>
  ${hair}
  ${beard}
  <path d="M102 120 C100 180 120 214 160 222 C200 214 220 180 218 120 C214 84 190 76 160 76 C130 76 106 84 102 120Z" fill="#f2c9a0" stroke="#9a6a40" stroke-width="4"/>
  <path d="M108 120 C150 96 170 96 212 120 L212 100 C190 84 130 84 108 100Z" fill="url(#marble)" stroke="#8aa0bd" stroke-width="3"/>
  <path d="M118 128 C130 118 148 118 152 130 M168 130 C172 118 190 118 202 128" fill="none" stroke="#e8f0fa" stroke-width="9" stroke-linecap="round"/>
  <path d="M120 140 C132 134 146 136 150 144 C140 152 126 152 120 140Z M170 144 C174 136 188 134 200 140 C194 152 180 152 170 144Z" fill="#fff" stroke="#6a4a2a" stroke-width="2.5"/>
  <circle cx="136" cy="143" r="6.5" fill="#38bdf8" filter="url(#glow)"/><circle cx="184" cy="143" r="6.5" fill="#38bdf8" filter="url(#glow)"/>
  <circle cx="136" cy="143" r="2.6" fill="#0b1220"/><circle cx="184" cy="143" r="2.6" fill="#0b1220"/>
  <path d="M154 148 C150 168 146 176 154 182 L166 182 C174 176 170 168 166 148" fill="#e2b088" stroke="#9a6a40" stroke-width="3"/>
  <path d="M124 188 C140 176 154 184 160 190 C166 184 180 176 196 188 C186 204 170 202 160 198 C150 202 134 204 124 188Z" fill="url(#marble)" stroke="#8aa0bd" stroke-width="3.5"/>
  <path d="M146 214 C154 220 166 220 174 214" fill="none" stroke="#9a6a40" stroke-width="3" stroke-linecap="round"/>
  <path d="M100 100 C110 70 130 60 160 58 C190 60 210 70 220 100" fill="none" stroke="#6f4a07" stroke-width="12" stroke-linecap="round"/>
  <path d="M100 100 C110 70 130 60 160 58 C190 60 210 70 220 100" fill="none" stroke="url(#gold)" stroke-width="8" stroke-linecap="round"/>
  ${[112, 130, 148, 172, 190, 208]
    .map(
      (x, i) =>
        `<path d="M${x} ${86 - Math.abs(i - 2.5) * -3 - 12} c-9 -4 -12 -16 -4 -22 c10 4 12 14 4 22Z" fill="url(#gold)" stroke="#6f4a07" stroke-width="2" transform="rotate(${(i - 2.5) * 6} ${x} 90)"/>`,
    )
    .join("")}
  <circle cx="160" cy="62" r="9" fill="#fde047" stroke="#6f4a07" stroke-width="3" filter="url(#glow)"/>`;
}

/* ───────────────────────── scatter + wild ───────────────────────── */
function scatter(): string {
  return `
  <path d="M30 150 C20 100 60 70 96 96 C70 100 56 130 60 160 C50 176 34 170 30 150Z M290 150 C300 100 260 70 224 96 C250 100 264 130 260 160 C270 176 286 170 290 150Z" fill="url(#marble)" stroke="#8aa0bd" stroke-width="4"/>
  <path d="M40 150 C38 116 62 96 86 108 M280 150 C282 116 258 96 234 108" fill="none" stroke="#b8cce6" stroke-width="4"/>
  <circle cx="160" cy="160" r="106" fill="#3a2406" stroke="#2a1804" stroke-width="6"/>
  <circle cx="160" cy="160" r="100" fill="url(#goldH)"/>
  <circle cx="160" cy="160" r="82" fill="url(#storm)" stroke="#6f4a07" stroke-width="6"/>
  <ellipse cx="124" cy="196" rx="44" ry="20" fill="#7d8bf0" opacity=".55" filter="url(#blur8)"/>
  <ellipse cx="206" cy="124" rx="40" ry="18" fill="#7d8bf0" opacity=".5" filter="url(#blur8)"/>
  <path d="M190 78 L140 168 L172 168 L152 244 L218 140 L184 140 L206 78Z" fill="#fde047" stroke="#fff" stroke-width="7" stroke-linejoin="round" filter="url(#glow)"/>
  <g fill="url(#gold)" stroke="#6f4a07" stroke-width="2">${Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<circle cx="${(160 + Math.cos(a) * 91).toFixed(1)}" cy="${(160 + Math.sin(a) * 91).toFixed(1)}" r="4.5"/>`;
  }).join("")}</g>
  <path d="M118 270 L202 270 L214 296 L106 296Z" fill="#c0262d" stroke="#6a0f14" stroke-width="4"/>
  <text x="160" y="291" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="22" fill="#fff6c2" stroke="#6a0f14" stroke-width="1.2" letter-spacing="3">FREE</text>`;
}

function wild(): string {
  return `
  <g filter="url(#glow)" fill="none" stroke="#7dd3fc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".95">
    <path d="M70 120 L100 136 L90 162 L124 170"/><path d="M250 110 L222 130 L236 156 L204 168"/>
    <path d="M86 250 L112 226 L132 244"/><path d="M236 252 L208 232 L190 250"/>
  </g>
  <path d="${BOLT}" fill="#6f4a07" transform="translate(-4 6)" opacity=".6"/>
  <path d="${BOLT}" fill="url(#gold)" stroke="#6f4a07" stroke-width="8" stroke-linejoin="round" filter="url(#glow)"/>
  <path d="M176 36 L116 150 L152 150" fill="none" stroke="#fffbe0" stroke-width="7" stroke-linecap="round" opacity=".85"/>
  <path d="M60 262 L260 262 L246 304 L74 304Z" fill="#26307a" stroke="#0e1244" stroke-width="5"/>
  <path d="M60 262 L260 262" stroke="#7dd3fc" stroke-width="4" opacity=".8"/>
  <text x="160" y="293" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="34" fill="#fde047" stroke="#6f4a07" stroke-width="2" letter-spacing="4">WILD</text>`;
}

/* ───────────────────────── backdrops ───────────────────────── */
function bolt(x: number, y: number, h: number, seed: number, color = "#cfe9ff", w = 5): string {
  let px = x;
  let py = y;
  let d = `M${px} ${py}`;
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const seg = 9;
  for (let i = 0; i < seg; i++) {
    px += (rnd() - 0.5) * 90;
    py += h / seg;
    d += ` L${px.toFixed(0)} ${py.toFixed(0)}`;
  }
  return `<g filter="url(#glow)"><path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${d}" stroke="#fff" stroke-width="${Math.max(1.5, w / 3)}" fill="none" stroke-linejoin="round"/></g>`;
}

function backdrop(bright: boolean): string {
  const W = 1280;
  const H = 720;
  const cloud = (x: number, y: number, s: number, c: string, o: number) =>
    `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}" filter="url(#blur20)" fill="${c}">
      <ellipse cx="0" cy="0" rx="190" ry="50"/><ellipse cx="-110" cy="12" rx="120" ry="42"/><ellipse cx="120" cy="10" rx="130" ry="44"/><ellipse cx="20" cy="-30" rx="120" ry="40"/></g>`;
  const cols = Array.from({ length: 6 }, (_, i) => {
    const x = 90 + i * 34;
    return `<rect x="${x}" y="512" width="14" height="70" fill="#0c1030"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${DEFS}
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${bright ? "#1b2a7a" : "#0a0f33"}"/><stop offset=".5" stop-color="${bright ? "#3a2f8a" : "#1b1a5a"}"/>
  <stop offset="1" stop-color="${bright ? "#6b3f8f" : "#2a1b50"}"/>
</linearGradient>
<radialGradient id="sun" cx=".5" cy=".38" r=".6">
  <stop offset="0" stop-color="#ffe9a8" stop-opacity="${bright ? 0.85 : 0.5}"/><stop offset=".5" stop-color="#ffb95a" stop-opacity=".18"/><stop offset="1" stop-color="#ffb95a" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" fill="url(#sun)"/>
${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 197) % W}" cy="${(i * 83) % 300}" r="${0.8 + (i % 3) * 0.6}" fill="#fff" opacity="${0.35 + (i % 4) * 0.12}"/>`).join("")}
<g transform="translate(640 0)" opacity=".35">${Array.from({ length: 9 }, (_, i) => `<path d="M0 260 L${-640 + i * 160} 720 L${-560 + i * 160} 720Z" fill="#ffe9a8"/>`).join("")}</g>
${cloud(180, 120, 1.3, "#2b2f86", 0.85)}${cloud(1090, 150, 1.4, "#2a2878", 0.85)}${cloud(640, 60, 1.6, "#3a3a9a", 0.6)}
${cloud(300, 330, 1.1, "#4a4fb8", 0.5)}${cloud(980, 360, 1.2, "#4a4fb8", 0.5)}
${bolt(140, 0, 420, 7, "#cfe9ff", 6)}${bolt(1130, 0, 400, 21, "#bfe0ff", 6)}${bolt(330, 40, 250, 33, "#9ad0ff", 4)}${bolt(960, 30, 280, 47, "#9ad0ff", 4)}
<path d="M0 560 C120 500 220 470 330 520 C420 560 470 620 560 640 L0 720Z" fill="#12163f"/>
<path d="M1280 540 C1160 480 1060 470 960 520 C880 560 820 620 740 650 L1280 720Z" fill="#12163f"/>
<g transform="translate(70 0)" opacity=".95">${cols}
  <path d="M70 510 L160 466 L250 510Z" fill="#0c1030"/><rect x="70" y="510" width="180" height="10" fill="#0c1030"/>
  <path d="M70 582 L250 582 L250 592 L70 592Z" fill="#0c1030"/></g>
<g transform="translate(900 40)" opacity=".95">${cols}
  <path d="M70 510 L160 466 L250 510Z" fill="#0c1030"/><rect x="70" y="510" width="180" height="10" fill="#0c1030"/>
  <path d="M70 582 L250 582 L250 592 L70 592Z" fill="#0c1030"/></g>
<path d="M0 640 C200 600 400 640 640 620 C880 600 1080 640 1280 610 L1280 720 L0 720Z" fill="#0a0d2e"/>
<g opacity=".75">${cloud(200, 690, 1.5, "#5a5fd0", 0.6)}${cloud(700, 700, 1.7, "#5a5fd0", 0.5)}${cloud(1150, 690, 1.4, "#5a5fd0", 0.6)}</g>
<rect width="${W}" height="${H}" fill="url(#sky)" opacity="0"/>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;
}

/* ───────────────────────── run ───────────────────────── */
const SYMBOLS: Array<[string, () => string]> = [
  ["10", laurel],
  ["J", amphora],
  ["Q", lyre],
  ["K", helmet],
  ["A", column],
  ["premium-a", eagle],
  ["premium-b", temple],
  ["premium-c", zeus],
  ["scatter", scatter],
  ["wild", wild],
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const tiles: Buffer[] = [];
  for (const [name, fn] of SYMBOLS) {
    // Trim transparent margins and re-centre so the symbol fills its reel cell.
    const trimmed = await sharp(Buffer.from(sym(fn())))
      .png()
      .trim()
      .toBuffer();
    const buf = await sharp(trimmed)
      .resize(308, 308, { fit: "inside" })
      .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT, `${name}.png`), buf);
    tiles.push(buf);
    console.log("wrote", name);
  }
  for (const [name, bright] of [
    ["backdrop", false],
    ["loading-bg", true],
  ] as const) {
    await sharp(Buffer.from(backdrop(bright)))
      .webp({ quality: 86 })
      .toFile(path.join(OUT, `${name}.webp`));
    console.log("wrote", name);
  }
  if (process.argv.includes("--sheet")) {
    const bg = await sharp(Buffer.from(backdrop(false)))
      .resize(1600, 900)
      .png()
      .toBuffer();
    const comps = tiles.map((t, i) => ({
      input: t,
      left: 40 + (i % 5) * 310,
      top: 60 + Math.floor(i / 5) * 330,
    }));
    await sharp(bg).composite(comps).png().toFile(SHEET);
    console.log("sheet", SHEET);
  }
}

void main();
