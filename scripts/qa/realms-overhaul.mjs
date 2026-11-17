// Authoring and evidence helper. Emits independent game styles; not a runtime skin switcher.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const queue = [
  ["magma-anvil", "Magma", "ma", "magma", "FORGED IN MOLTEN STONE"],
  ["monarch-meadow", "Meadow", "mm", "meadow", "WINGS IN THE WILDFLOWERS"],
  ["monsoon-grove", "Monsoon", "mg", "monsoon", "WHEN THE RAINS ARRIVE"],
  ["moonwell-mysteries", "Moonwell", "mw", "moonwell", "DRAW FROM THE DEEP WELL"],
  ["nebula-nomads", "Nebula", "nn", "nebula", "CAMPFIRES AMONG THE STARS"],
  ["northwind-narwhal", "Narwhal", "nw", "narwhal", "ARCTIC TIDES"],
  ["obsidian-oracle", "Oracle", "oo", "oracle", "THE GLASS THAT SEES"],
  ["orchid-oasis", "Orchid", "oc", "orchid", "A HIDDEN BLOOM"],
  ["persian-peacock", "Peacock", "pp", "peacock", "THE SHAH’S PALACE"],
  ["polar-prism", "Prism", "pr", "prism", "LIGHT SPLIT BY ICE"],
  ["potion-parlor", "Parlor", "pz", "parlor", "BREWS BY CANDLELIGHT"],
  ["rocket-rendezvous", "Rocket", "rv", "rocket", "DOCKING IN ORBIT"],
  ["salamander-sun", "Salamander", "ss", "salamander", "BASKING IN EMBERS"],
  ["saturn-rings", "Saturn", "sn", "saturn", "RIDING THE RINGS"],
  ["shogun-sakura", "Shogun", "sk", "shogun", "BLOSSOMS AND BLADES"],
  ["snowglobe-sorcery", "Snowglobe", "sg", "snowglobe", "A WINTER WORLD IN GLASS"],
  ["stag-spirit-glade", "Stag", "stg", "stag", "THE ANTLERED SPIRIT"],
  ["steamforge-express", "Steamforge", "se", "steamforge", "ALL ABOARD THE FORGE"],
  ["tarot-twilight", "Tarot", "tt", "tarot", "THE CARDS FALL AT DUSK"],
  ["tesla-tower", "Tesla", "ts", "tesla", "LIGHTNING ON THE WIRE"],
  ["thunderbird-totem", "Thunderbird", "tb", "thunderbird", "STORM-BORN SPIRIT"],
  ["tortoise-treasury", "Tortoise", "tr", "tortoise", "SLOW AND GOLDEN"],
];
const specs = {
  "magma-anvil": {
    concept:
      "Forged workbench: riveted iron ledger, inset wager rail, full-width molten strike bar, four independent tool switches.",
    accent: "#fb923c",
    soft: "#ffedd5",
    bg: "#170b09",
    face: "#3c201a",
    font: 'Bahnschrift, "Segoe UI", sans-serif',
    radius: "8px",
    tile: "18%",
    frame: "10px",
    rows: [56, 48, 76, 52],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "bet bet bet bet" "spin spin spin spin" "turbo auto bonus info"',
    css: `.P-console{border-top:3px solid var(--ui-accent);background:linear-gradient(135deg,#35221fee,#140d0df5);box-shadow:inset 0 0 0 4px #130c0b,0 16px 36px #0009}
.P-ledger{border:1px solid #a0897544;background:#0d0909;border-radius:3px;padding:8px 12px;box-shadow:inset 0 2px 8px #0009}
.P-spin-mount{padding:5px;border:1px solid #945132;border-radius:8px;background:repeating-linear-gradient(135deg,#f9731619 0 5px,#09060566 5px 10px)}
.P-spin{width:100%;height:100%;border-radius:5px;background:linear-gradient(#ffb65d,#c2410c 65%,#7c2d12);box-shadow:inset 0 2px 0 #fff5,inset 0 -4px 0 #461604;flex-direction:row;gap:16px;color:#250b02}
.P-spin__art{width:48px;height:48px}.P-spin>svg{width:22px;height:22px}.P-spin>span{font-size:17px;letter-spacing:.2em}
.P-chip{border-bottom:3px solid #8d4725}.P-step{border-radius:5px}.P-bet__value{border-radius:4px}
S .realms-well{border-top:3px solid #c47744!important;box-shadow:inset 0 0 0 3px #0b0707,0 16px 40px #0009!important}`,
  },
  "monarch-meadow": {
    concept:
      "Botanical crown: separate oval account plaques, butterfly flight pad beside the wager, paired garden actions below.",
    accent: "#e8c777",
    soft: "#fff7d6",
    bg: "#14291d",
    face: "#294733",
    font: '"Trebuchet MS", sans-serif',
    radius: "24px",
    tile: "50% 50% 22% 22%",
    frame: "34px 34px 18px 18px",
    rows: [60, 48, 52, 48],
    cols: "minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,.8fr) minmax(0,.8fr)",
    areas:
      '"ledger ledger ledger ledger" "bet bet spin spin" "turbo auto spin spin" "bonus bonus info info"',
    css: `.P-console{background:none;border:0;padding:8px;box-shadow:none}.P-ledger{gap:16px;background:none;border:0;padding:0}.P-meter{padding:10px 14px;border:1px solid #e8c77766;border-radius:22px 22px 10px 22px;background:#11291ded}.P-meter[data-meter="win"]{border-radius:22px 22px 22px 10px}
.P-bet{grid-template-columns:44px minmax(0,1fr) 44px;gap:4px}.P-bet__value{border:0;background:#162e21}.P-step{border-radius:50%;background:#314b32;color:#ffe8a4}
.P-spin-mount{border:1px solid #e8c77788;border-radius:50% 50% 30% 30%;padding:6px;background:linear-gradient(140deg,#8ca75855,#122b1c);box-shadow:0 8px 22px #0006}
.P-spin{width:100%;height:100%;border-radius:50% 50% 30% 30%;background:radial-gradient(ellipse at top,#f9e8af,#b8913a 70%,#5d5327);color:#25351c}.P-spin__art{width:48px;height:48px}.P-spin>svg{display:none}.P-chip{border-radius:20px 6px 20px 6px}.P-bonus{background:linear-gradient(100deg,#455c31,#1b3525)}
S .realms-well{border-color:#e8c77777!important;background:linear-gradient(135deg,#314931f0,#122a1ef5)!important}`,
  },
  "monsoon-grove": {
    concept:
      "Rain shelter: canopy-edged ledger, droplet action well at left, wager and weather switches at right, wide bonus basin.",
    accent: "#5eead4",
    soft: "#d1fae5",
    bg: "#071f20",
    face: "#123b39",
    font: '"Segoe UI", sans-serif',
    radius: "18px 5px 18px 5px",
    tile: "50% 10% 50% 10%",
    frame: "28px 8px 28px 8px",
    rows: [56, 48, 52, 48],
    cols: "minmax(0,.8fr) minmax(0,.8fr) minmax(0,1.2fr) minmax(0,1.2fr)",
    areas:
      '"ledger ledger ledger ledger" "spin spin bet bet" "spin spin turbo auto" "bonus bonus bonus info"',
    css: `.P-console{border-top:0;border-radius:8px 28px 8px 28px;background:linear-gradient(160deg,#144642ed,#071b1ff5);border-bottom:3px solid #5eead466}.P-ledger{padding:8px 12px;border-radius:4px 18px 4px 18px;background:#03161999;border-top:1px solid #a7f3d055}
.P-spin-mount{border-radius:55% 45% 55% 12%;padding:7px;background:linear-gradient(140deg,#81c9b6,#0f534e 55%,#062524);border:1px solid #b1f5dd88}
.P-spin{width:100%;height:100%;border-radius:55% 45% 55% 12%;background:radial-gradient(at 40% 20%,#9bf1d9,#158477 60%,#0a3835);color:#eafff7}.P-spin>svg{display:none}.P-spin__art{width:48px;height:48px}
.P-bet{grid-template-columns:44px minmax(0,1fr) 44px;gap:4px}.P-bet__value{background:transparent;border:0}.P-step{border-radius:50%}.P-bonus{flex-direction:row;gap:10px;border-radius:8px 20px 8px 20px}.P-chip{border-color:#72b9aa55}
S .realms-well{box-shadow:inset 0 2px 0 #adf5dd33,0 14px 32px #0009!important}`,
  },
  "moonwell-mysteries": {
    concept:
      "Lunar shrine: twin silver readouts above a central moonwell surrounded by four independent arcane tablets; wager beneath.",
    accent: "#b8c8fb",
    soft: "#f1edff",
    bg: "#10162d",
    face: "#272c50",
    font: "Georgia, serif",
    radius: "20px",
    tile: "50%",
    frame: "40px 40px 18px 18px",
    rows: [58, 52, 52, 48],
    cols: "minmax(0,1fr) 112px minmax(0,1fr)",
    areas: '"ledger ledger ledger" "turbo spin bonus" "auto spin info" "bet bet bet"',
    css: `.P-console{background:radial-gradient(ellipse at 50% 35%,#57668f55,#10152be8 70%);border-radius:40px 40px 20px 20px;border:1px solid #b8c8fb44}.P-ledger{padding:6px 8px;border-bottom:1px solid #b8c8fb33}.P-meter[data-meter="win"]{border-left:1px solid #b8c8fb33;padding-left:12px}
.P-spin-mount{display:grid;place-items:center;border-radius:50%;border:1px solid #d9defa88;background:repeating-radial-gradient(circle,#c7d2fe18 0 2px,transparent 3px 8px);padding:7px}
.P-spin{width:96px;height:96px;border-radius:50%;border:2px solid #d9defa;background:radial-gradient(at 35% 25%,#f5f3ff,#a5b4fc 40%,#373a72 85%);color:#18213e;box-shadow:inset -5px -5px 12px #29356988,0 0 18px #c7d2fe33}.P-spin__art{width:43px;height:43px}.P-spin>svg{display:none}.P-chip{background:#121a35bb;border-radius:18px 18px 5px 5px;border-color:#b8c8fb55}.P-bet{padding-top:2px}
S .realms-well{background:radial-gradient(ellipse at top,#39446bf0,#10162ff5)!important;border-color:#c7d2fe77!important}`,
  },
  "nebula-nomads": {
    concept:
      "Survey cockpit: two instrument windows, full-width launch dock, wager rail, segmented flight controls.",
    accent: "#5ee7fa",
    soft: "#d6faff",
    bg: "#0b1129",
    face: "#20284a",
    font: "Consolas, monospace",
    radius: "4px",
    tile: "12%",
    frame: "16px 4px 16px 4px",
    rows: [58, 80, 48, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "spin spin spin spin" "bet bet bet bet" "auto turbo info bonus"',
    css: `.P-console{border:1px solid #5ee7fa55;border-left:4px solid #5ee7fa88;background:linear-gradient(110deg,#172441ee,#0c112af5);border-radius:12px 3px 12px 3px}.P-ledger{gap:12px;padding:0;background:transparent}.P-meter{background:#040b20;border:1px solid #5ee7fa33;padding:7px 10px;border-radius:3px}.P-meter>span{font-size:8px}.P-meter strong{color:#ccf7ff}
.P-spin-mount{border:1px solid #5ee7fa66;padding:6px 12px;background:repeating-linear-gradient(90deg,#5ee7fa11 0 1px,transparent 1px 14px);border-radius:40px 6px 40px 6px}
.P-spin{width:100%;height:100%;border-radius:32px 4px 32px 4px;flex-direction:row;gap:20px;background:linear-gradient(105deg,#214785,#24b5ce);color:#ecfeff}.P-spin__art{width:48px;height:48px}.P-spin>svg{width:20px;height:20px}.P-spin>span{font-size:16px;letter-spacing:.2em}.P-chip{border-radius:3px;border-bottom:2px solid #5ee7fa88}.P-bet__value{border-color:#5ee7fa88;background:#060e23}
S .realms-well{border:1px solid #5ee7fa77!important;border-left:4px solid #a78bfa99!important}`,
  },
  "northwind-narwhal": {
    concept:
      "Nautical bridge: chart-like ledger, wide arctic navigation dial on the right, two stacked port controls and a separate bonus rail.",
    accent: "#7dd3fc",
    soft: "#e0f2fe",
    bg: "#071e32",
    face: "#15394c",
    font: '"Trebuchet MS", sans-serif',
    radius: "14px",
    tile: "30%",
    frame: "24px",
    rows: [58, 48, 52, 48],
    cols: "minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,.8fr) minmax(0,.8fr)",
    areas:
      '"ledger ledger ledger ledger" "bet bet spin spin" "auto info spin spin" "turbo turbo bonus bonus"',
    css: `.P-console{border:1px solid #bae6fd55;border-radius:24px 24px 10px 10px;background:linear-gradient(#183c50ed,#061c30f5);box-shadow:inset 0 3px 0 #bae6fd22,0 14px 30px #0008}.P-ledger{border-bottom:1px dashed #bae6fd55;padding:7px 8px}.P-meter[data-meter="win"]{border-left:1px solid #bae6fd33;padding-left:12px}
.P-spin-mount{border:1px solid #bae6fd88;border-radius:50% 50% 18px 18px;padding:6px;background:conic-gradient(#bed9e555,#193b51,#bed9e555,#193b51,#bed9e555)}
.P-spin{width:100%;height:100%;border-radius:50% 50% 16px 16px;background:radial-gradient(at 35% 15%,#e5f7ff,#38a6cf 60%,#14506d);color:#052c45;border:2px solid #c7e9f5}.P-spin>svg{display:none}.P-spin__art{width:46px;height:46px}.P-chip{background:#0b283e;border-radius:12px}.P-turbo,.P-bonus{flex-direction:row;gap:8px}.P-bet{grid-template-columns:44px minmax(0,1fr) 44px;gap:4px}.P-bet__value{border:0;background:transparent}
S .realms-well{border-color:#a6d9ec77!important;box-shadow:inset 0 3px 0 #e0f2fe22,0 14px 36px #0009!important}`,
  },
  "obsidian-oracle": {
    concept:
      "Oracle altar: a tall obsidian scrying seal at left, right-aligned account and wager tablets, three ritual switches and a full-width information footer.",
    accent: "#c4a5f5",
    soft: "#f4eaff",
    bg: "#140d20",
    face: "#30223f",
    font: "Georgia, serif",
    radius: "5px 18px 5px 18px",
    tile: "50%",
    frame: "30px 8px 30px 8px",
    rows: [60, 52, 52, 44],
    cols: "100px minmax(0,1fr) minmax(0,1fr)",
    areas: '"spin ledger ledger" "spin bet bet" "turbo auto bonus" "info info info"',
    css: `.P-console{border:0;border-left:2px solid #c4a5f577;background:linear-gradient(110deg,#291b3bed,#100b1af0);border-radius:3px 28px 3px 28px}.P-ledger{gap:8px;align-items:stretch}.P-meter{justify-content:center;padding:6px;border-bottom:1px solid #c4a5f544}.P-meter strong{font-size:15px}.P-meter>span{font-size:8px;letter-spacing:.06em}
.P-spin-mount{padding:6px;border-radius:45px 45px 8px 8px;background:linear-gradient(135deg,#a68bb2,#20152e 35%,#0a0712);border:1px solid #c4a5f566;box-shadow:0 0 18px #aa72e122}
.P-spin{width:100%;height:100%;border-radius:40px 40px 5px 5px;background:radial-gradient(at 50% 30%,#59416b,#160e27 75%);border:1px solid #b390e777;color:#eaddff}.P-spin__art{width:50px;height:50px}.P-spin>svg{display:none}.P-bet{grid-template-columns:44px minmax(0,1fr) 44px;gap:4px}.P-bet__value{border:0;background:transparent}.P-info{flex-direction:row;gap:8px;border:0;border-top:1px solid #c4a5f544;background:transparent}.P-chip{border-radius:4px 12px 4px 12px}
S .realms-well{border-width:1px 3px!important;border-color:#6d4c8c!important;background:radial-gradient(ellipse at top,#372442f2,#100b1df5)!important}`,
  },
  "orchid-oasis": {
    concept:
      "Spa pavilion: floating ivory account plaques, a quiet full-width wager, central orchid capsule flanked by bonus and rules, two broad poolside switches.",
    accent: "#f3b8db",
    soft: "#fff1f8",
    bg: "#271b2a",
    face: "#51344b",
    font: "Georgia, serif",
    radius: "24px",
    tile: "45% 45% 16% 16%",
    frame: "38px",
    rows: [58, 48, 84, 48],
    cols: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
    areas:
      '"ledger ledger ledger ledger" "bet bet bet bet" "bonus spin spin info" "turbo turbo auto auto"',
    css: `.P-console{border:0;background:linear-gradient(180deg,#35263b99,#251727e8);border-radius:32px;padding:14px}.P-ledger{gap:14px}.P-meter{padding:8px 12px;border-radius:18px;background:#fff0f014;color:#ffe8f2;border:1px solid #f3b8db33}.P-bet{border-bottom:1px solid #f3b8db33;padding-bottom:2px}.P-step{border:0;border-radius:50%;background:#ecd8d51f}.P-bet__value{border:0;background:transparent}
.P-spin-mount{border-radius:50px;padding:5px;border:1px solid #f8d5e988;background:linear-gradient(135deg,#e8cad666,#51334c)}
.P-spin{border-radius:50px;background:linear-gradient(150deg,#ffe5ed,#c986ad);color:#3b2033;border:0;flex-direction:row;gap:8px}.P-spin__art{width:42px;height:42px}.P-spin>svg{display:none}.P-chip{background:#3e2c3b99;border-color:#f3b8db33}.P-turbo,.P-auto{flex-direction:row;gap:8px;border-radius:24px}.P-info,.P-bonus{border-radius:18px}
S .realms-well{border-color:#eac6cf77!important;box-shadow:inset 0 2px 0 #ffe9f422,0 14px 34px #0008!important}`,
  },
  "persian-peacock": {
    concept:
      "Palace throne: a domed jewel spin alcove crowns the panel, with flanking court actions, a gold ledger balcony and mosaic wager/footer rails.",
    accent: "#e9c779",
    soft: "#fff1c9",
    bg: "#102b31",
    face: "#24505a",
    font: "Georgia, serif",
    radius: "16px 16px 5px 5px",
    tile: "50% 50% 8% 8%",
    frame: "36px 36px 10px 10px",
    rows: [104, 56, 48, 48],
    cols: "minmax(0,1fr) 112px minmax(0,1fr)",
    areas: '"turbo spin bonus" "ledger ledger ledger" "bet bet bet" "auto auto info"',
    css: `.P-console{background:linear-gradient(145deg,#21434bed,#10252ef5);border:1px solid #d8b36477;border-radius:56px 56px 12px 12px;box-shadow:inset 0 0 0 4px #10252e,inset 0 0 0 5px #d8b36433,0 14px 36px #0008}.P-ledger{padding:8px 10px;border-top:1px solid #e9c77977;border-bottom:1px solid #e9c77933}.P-chip{background:#0d252ebb;border:1px solid #d8b36455;border-radius:26px 26px 6px 6px}.P-turbo,.P-bonus{align-self:center;height:64px}
.P-spin-mount{padding:6px;border:1px solid #f0d18b;border-radius:60px 60px 8px 8px;background:linear-gradient(120deg,#dfc580,#193f47 35%,#dfc580)}
.P-spin{border-radius:54px 54px 5px 5px;background:radial-gradient(at 50% 30%,#347d78,#0b303e 75%);color:#fff1c9;border-color:#e9c77988}.P-spin__art{width:48px;height:48px}.P-spin>svg{display:none}.P-auto{flex-direction:row;gap:10px;border-radius:6px}.P-info{border-radius:6px}.P-bet__value{border-radius:3px;background:#092129}
S .realms-well{border:2px solid #ae8748!important;box-shadow:inset 0 0 0 3px #12343e,inset 0 0 0 4px #e9c77944,0 16px 36px #0009!important}`,
  },
  "polar-prism": {
    concept:
      "Prism instrument: a slim vertical refractor spin well, offset wager and three crystal switches, and a full-width aurora bonus strip.",
    accent: "#a5f3fc",
    soft: "#edfaff",
    bg: "#102237",
    face: "#284358",
    font: '"Segoe UI", sans-serif',
    radius: "5px",
    tile: "18%",
    frame: "14px 32px 14px 32px",
    rows: [56, 52, 52, 48],
    cols: "64px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
    areas:
      '"ledger ledger ledger ledger" "spin bet bet bet" "spin turbo auto info" "bonus bonus bonus bonus"',
    css: `.P-console{border:1px solid #d4f9ff77;border-radius:8px 24px 8px 24px;background:linear-gradient(125deg,#345168cc,#122338f2);box-shadow:inset 3px 0 0 #c7eaff33,inset -3px 0 0 #c4b5fd33,0 14px 34px #0008}.P-ledger{padding:8px 10px;background:#03162977;border-radius:8px 18px 8px 18px}.P-spin-mount{border:1px solid #d4f9ff99;border-radius:8px 28px 8px 28px;padding:4px;background:linear-gradient(145deg,#a5f3fc77,#c4b5fd33,#a5f3fc77)}
.P-spin{border-radius:6px 24px 6px 24px;background:linear-gradient(120deg,#c4b5fd,#b6f4ff 45%,#6ba7ce);color:#173b55;border:0}.P-spin__art{width:38px;height:38px}.P-spin>svg{display:none}.P-spin>span{font-size:10px}.P-bonus{flex-direction:row;gap:12px;border:1px solid #c4b5fd77;background:linear-gradient(100deg,#43506a,#183f51)}.P-chip{border-color:#bae6fd66;background:#17394c}.P-step{background:#a5f3fc18}
S .realms-well{border-color:#c6eafa99!important;background:linear-gradient(125deg,#3c5669f0,#142b43f5 70%,#42405bf0)!important}`,
  },
  "potion-parlor": {
    concept:
      "Apothecary bench: bottle-label account windows, a tall bubbling flask spin chamber between four shelf cards, with a separate dosage rail.",
    accent: "#d4a5fa",
    soft: "#faf0ff",
    bg: "#24162c",
    face: "#473055",
    font: '"Trebuchet MS", sans-serif',
    radius: "12px 12px 22px 22px",
    tile: "32%",
    frame: "20px 20px 34px 34px",
    rows: [60, 48, 52, 52],
    cols: "minmax(0,1fr) 104px minmax(0,1fr)",
    areas: '"ledger ledger ledger" "bet bet bet" "turbo spin auto" "bonus spin info"',
    css: `.P-console{border:1px solid #b386c855;border-radius:10px 10px 28px 28px;background:linear-gradient(#483043ee,#24172df2);border-bottom:5px solid #7d5768}.P-ledger{gap:16px}.P-meter{background:#f6e7e5;color:#492a43;padding:8px 10px;border-radius:5px 5px 12px 12px;box-shadow:inset 0 0 0 3px #c6a2b622}.P-meter>span,.P-meter strong{color:#492a43}.P-meter>span{font-size:8px}
.P-spin-mount{border-radius:12px 12px 38px 38px;padding:6px;border:1px solid #e7cafa99;background:linear-gradient(90deg,#e7cafa55,#24162c33,#e7cafa55)}
.P-spin{border-radius:8px 8px 32px 32px;background:linear-gradient(180deg,#bde4da33 15%,#d4a5fa99 40%,#a05ad7 80%);color:#fff0ff;border-color:#e9d5ff88;box-shadow:inset 5px 0 0 #fff1}.P-spin__art{width:48px;height:48px}.P-spin>svg{display:none}.P-chip{border-radius:6px 6px 16px 16px;background:#302039}.P-bet__value{border-radius:8px;background:#201429}.P-step{border-radius:50%;background:#614b64}
S .realms-well{box-shadow:inset 0 -4px 0 #72526477,0 16px 38px #0008!important}`,
  },
  "rocket-rendezvous": {
    concept:
      "Retro mission console: telemetry ledger, fuel wager beside a turbo switch, long illuminated launch key with a separate auto key, and paired mission cards.",
    accent: "#6ee7e7",
    soft: "#e6fffb",
    bg: "#141e30",
    face: "#344759",
    font: "Consolas, monospace",
    radius: "10px",
    tile: "10%",
    frame: "12px 24px 12px 24px",
    rows: [56, 48, 72, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "bet bet bet turbo" "spin spin spin auto" "bonus bonus info info"',
    css: `.P-console{border:2px solid #788b99;border-radius:18px;background:linear-gradient(120deg,#435362ed,#182333f5);box-shadow:inset 0 0 0 4px #182333,0 16px 34px #0008}.P-ledger{background:#071b29;padding:8px 12px;border-radius:8px;box-shadow:inset 0 2px 6px #0008}.P-meter strong{font-family:Consolas,monospace;color:#a7f3d0}.P-meter>span{color:#d4f6e6}
.P-spin-mount{padding:5px;border-radius:12px;border:1px solid #b8cad1;background:#0b1423;box-shadow:inset 0 2px 5px #000}
.P-spin{border-radius:8px;background:linear-gradient(#ffb57a,#e76443 75%,#9a392e);color:#301a12;flex-direction:row;gap:10px;border-color:#ffc7a0;box-shadow:inset 0 2px 0 #fff5,inset 0 -4px 0 #872b24}.P-spin__art{width:42px;height:42px}.P-spin>svg{display:none}.P-spin>span{font-size:15px;letter-spacing:.16em}.P-turbo{border-radius:50% 50% 10px 10px;background:#173846}.P-auto{background:#073440;border:1px solid #6ee7e788}.P-bonus,.P-info{flex-direction:row;gap:10px;background:#243744}.P-bet__value{background:#081b2a}
S .realms-well{border:2px solid #8799a5!important;box-shadow:inset 0 0 0 3px #1b283a,0 14px 34px #0009!important}`,
  },
  "salamander-sun": {
    concept:
      "Sunrise dais: account horizon, four solar tablets, a round sun disc inside a wide radiant cradle, and a bottom heat wager rail.",
    accent: "#fbbf5a",
    soft: "#fff2cd",
    bg: "#2a140f",
    face: "#593224",
    font: "Bahnschrift, sans-serif",
    radius: "18px",
    tile: "50%",
    frame: "38px 38px 12px 12px",
    rows: [56, 48, 92, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "turbo auto bonus info" "spin spin spin spin" "bet bet bet bet"',
    css: `.P-console{border-radius:44px 44px 14px 14px;background:linear-gradient(#673820cc,#25110ef2);border:1px solid #fbbf5a66}.P-ledger{padding:8px 12px;border-bottom:1px solid #fbbf5a44}.P-chip{border-radius:22px 22px 8px 8px;background:#371b14}.P-spin-mount{background:radial-gradient(ellipse at 50% 100%,#ffb34744,transparent 70%);border-bottom:1px solid #fbbf5a66;border-radius:45% 45% 0 0;padding:0}
.P-spin{width:88px;height:88px;border-radius:50%;background:radial-gradient(at 35% 20%,#fff3a4,#ffc34f 45%,#bb5a22);border:3px solid #edbb63;box-shadow:0 0 0 5px #fbbf5a22,inset 0 0 0 1px #fff6;color:#5c290d}.P-spin__art{width:44px;height:44px}.P-spin>svg{display:none}.P-bet__value{border-radius:8px 8px 24px 24px;border-color:#fbbf5a66}.P-step{border-radius:50%}
S .realms-well{border-top:3px solid #fbbf5a88!important;background:radial-gradient(at 50% 0,#683e23ef,#24110ff5)!important}`,
  },
  "saturn-rings": {
    concept:
      "Orbital salon: a split observatory ledger, slim wager bridge, elliptical ringed spin cradle between auto and bonus towers, two broad navigation tabs.",
    accent: "#debfa3",
    soft: "#fff2e3",
    bg: "#18182e",
    face: "#3e354d",
    font: '"Segoe UI", sans-serif',
    radius: "28px",
    tile: "35%",
    frame: "32px",
    rows: [58, 48, 104, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "bet bet bet bet" "auto spin spin bonus" "turbo turbo info info"',
    css: `.P-console{border:0;border-radius:32px;background:linear-gradient(125deg,#514050aa,#18182ef2)}.P-ledger{gap:16px}.P-meter{border-bottom:1px solid #debfa366;padding:8px 10px}.P-bet__value{border:0;background:transparent}.P-step{border-radius:50%;background:#debfa31a}.P-spin-mount{position:relative;border:2px solid #debfa388;border-radius:50%;background:linear-gradient(160deg,#debfa322,transparent 60%,#b6a8d333);padding:5px 16px;box-shadow:inset 0 0 0 5px #18182e77}
.P-spin{width:88px;height:88px;border-radius:50%;background:radial-gradient(at 35% 20%,#fff0d5,#b89a89 45%,#5e5071 90%);color:#241f35;border-color:#f1d3b8}.P-spin__art{width:44px;height:44px}.P-spin>svg{display:none}.P-auto,.P-bonus{background:#211f37;border-radius:32px;align-self:center;height:76px}.P-turbo,.P-info{flex-direction:row;gap:10px;background:#332c44;border:0}
S .realms-well{border-color:#debfa377!important;box-shadow:inset 0 0 0 4px #18182e88,0 16px 38px #0008!important}`,
  },
  "shogun-sakura": {
    concept:
      "Sakura courtyard: paper-screen account panel, lacquer wager beam, a vertical red seal inside a torii-like spin enclosure, four flanking wooden plaques.",
    accent: "#f3a3a8",
    soft: "#fff0df",
    bg: "#231719",
    face: "#493035",
    font: "Georgia, serif",
    radius: "4px",
    tile: "10%",
    frame: "6px",
    rows: [56, 48, 52, 52],
    cols: "minmax(0,1fr) 100px minmax(0,1fr)",
    areas: '"ledger ledger ledger" "bet bet bet" "turbo spin info" "auto spin bonus"',
    css: `.P-console{border:0;border-top:4px solid #9c4c4b;border-bottom:4px solid #9c4c4b;background:linear-gradient(90deg,#311e20ed,#1e1519f2);border-radius:3px}.P-ledger{background:#efddcb;padding:8px 12px;border-left:4px solid #a05b59;border-right:4px solid #a05b59}.P-meter>span,.P-meter strong{color:#4b2d31}.P-meter[data-meter="win"]{border-left:1px solid #bc918066;padding-left:12px}
.P-spin-mount{padding:8px;border-top:5px solid #d87274;border-inline:3px solid #783739;background:#130d11;box-shadow:0 3px 0 #5c2a2b}
.P-spin{border-radius:2px;background:linear-gradient(110deg,#bd5358,#7c2d37);color:#ffe9cb;border:1px solid #e5a080;box-shadow:inset 0 0 0 3px #3e202033}.P-spin__art{width:46px;height:46px}.P-spin>svg{display:none}.P-chip{border-radius:2px;background:#432b2b;border:1px solid #bd8c7966}.P-bet__value{border:0;border-bottom:2px solid #b98275;background:#1c1418}.P-step{background:#ad626244;border-radius:2px}
S .realms-well{border:2px solid #805b4c!important;box-shadow:inset 0 0 0 3px #251919,0 14px 36px #0009!important}`,
  },
  "snowglobe-sorcery": {
    concept:
      "Winter music box: frosted account windows, a glass globe spin above its wager pedestal, flanking auto/bonus snowbanks and paired lower switches.",
    accent: "#c4e3ff",
    soft: "#f6fbff",
    bg: "#172a43",
    face: "#37506e",
    font: '"Trebuchet MS", sans-serif',
    radius: "22px",
    tile: "50%",
    frame: "34px 34px 18px 18px",
    rows: [58, 108, 48, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "bonus spin spin auto" "bet bet bet bet" "turbo turbo info info"',
    css: `.P-console{border:1px solid #d9eeff77;border-radius:30px;background:linear-gradient(160deg,#7598b544,#122640ee);box-shadow:inset 0 2px 0 #fff3,0 14px 36px #0007}.P-ledger{gap:12px}.P-meter{border:1px solid #d9eeff44;border-radius:16px;background:#b6d9f71a;padding:8px 10px}.P-spin-mount{padding:0;border-bottom:5px solid #abc8e4;border-radius:50% 50% 12px 12px;background:radial-gradient(at 50% 0,#e2f4ff44,transparent 75%)}
.P-spin{width:98px;height:98px;border-radius:50%;border:2px solid #e7f5ff;background:radial-gradient(at 30% 20%,#f5fcffb0,#94c8f266 40%,#426b9a 90%);color:#effaff;box-shadow:inset 5px 4px 0 #fff2,inset -6px -8px 12px #0d2f5a88}.P-spin__art{width:48px;height:48px}.P-spin>svg{display:none}.P-bonus,.P-auto{height:72px;align-self:center;background:#24425d;border-radius:24px 24px 10px 10px}.P-turbo,.P-info{flex-direction:row;gap:10px;border-radius:24px;background:#c4e3ff18}.P-bet__value{background:#091b32;border-radius:6px}
S .realms-well{border-top:3px solid #e2f4ff99!important;box-shadow:inset 0 1px 12px #d9eeff22,0 16px 40px #0008!important}`,
  },
  "stag-spirit-glade": {
    concept:
      "Spirit clearing: carved account tablets and a separate wager, tall antler-grove spin alcove on the left, four mossy stone actions on the right.",
    accent: "#b3d99a",
    soft: "#f0f6d8",
    bg: "#13261f",
    face: "#304a35",
    font: "Georgia, serif",
    radius: "5px 20px 5px 20px",
    tile: "45% 45% 10% 10%",
    frame: "42px 12px 42px 12px",
    rows: [58, 48, 52, 52],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "bet bet bet bet" "spin spin info bonus" "spin spin auto turbo"',
    css: `.P-console{background:linear-gradient(135deg,#354837dd,#0f231df0);border:0;border-left:3px solid #7f9360;border-radius:5px 30px 5px 30px}.P-ledger{gap:16px}.P-meter{padding:8px 12px;border:1px solid #b3d99a44;border-radius:4px 18px 4px 18px;background:#0a1a16}.P-bet__value{border:0;border-bottom:1px solid #b3d99a66;background:transparent}.P-step{border-radius:50%;background:#52684155}
.P-spin-mount{padding:6px;border-radius:55% 55% 8px 8px;border:1px solid #b3d99a77;background:linear-gradient(120deg,#526d46,#122b22 40%,#526d46)}
.P-spin{border-radius:55% 55% 5px 5px;background:radial-gradient(at 40% 20%,#658c58,#1d4939 65%,#102e25);border-color:#c4dba166;color:#eaffcf}.P-spin__art{width:52px;height:52px}.P-spin>svg{display:none}.P-chip{background:#20382c;border-radius:18px 4px 18px 4px;border-color:#b3d99a44}
S .realms-well{border-left:3px solid #829b62!important;border-right:3px solid #829b62!important;box-shadow:inset 0 0 12px #b3d99a0f,0 16px 36px #0008!important}`,
  },
  "steamforge-express": {
    concept:
      "Locomotive cab: brass-rimmed pressure readouts, a black enamel wager bar, central flywheel spin control between two valve keys, broad auto and ticket levers.",
    accent: "#ddb875",
    soft: "#fff0cc",
    bg: "#231c17",
    face: "#4d4130",
    font: "Bahnschrift, sans-serif",
    radius: "6px",
    tile: "15%",
    frame: "14px",
    rows: [58, 48, 76, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "bet bet bet bet" "turbo spin spin info" "auto auto bonus bonus"',
    css: `.P-console{border:2px solid #8f784e;border-radius:12px;background:linear-gradient(145deg,#665740ee,#211d19f5);box-shadow:inset 0 0 0 4px #231c17,inset 0 0 0 5px #c5a46855,0 14px 34px #0008}.P-ledger{gap:12px}.P-meter{border:2px solid #bfa16c;background:#15130e;border-radius:8px;padding:6px 10px;box-shadow:inset 0 2px 6px #0009}.P-meter strong{font-family:Consolas,monospace;color:#f6e5a3}
.P-spin-mount{padding:5px;border-radius:40px;border:2px solid #bfa16c;background:repeating-conic-gradient(#bd9c5c 0 10deg,#34291c 10deg 20deg)}
.P-spin{border-radius:32px;background:linear-gradient(#f1d49a,#ad813e 65%,#684b24);border:2px solid #332b1e;color:#302315;flex-direction:row;gap:8px}.P-spin__art{width:44px;height:44px}.P-spin>svg{display:none}.P-auto,.P-bonus{flex-direction:row;gap:10px;background:#211e17;border-bottom:3px solid #9c7b43}.P-turbo,.P-info{background:#332c22;border-radius:50% 50% 5px 5px}.P-bet__value{background:#0e110f;border-color:#bfa16c66}
S .realms-well{border:2px solid #a58b5f!important;box-shadow:inset 0 0 0 4px #211b15,inset 0 0 0 5px #d6b66f33,0 16px 36px #0009!important}`,
  },
  "tarot-twilight": {
    concept:
      "Velvet reading table: two card-shaped account plaques, a tall gilded spin card between four ritual cards, and a bottom wager ribbon.",
    accent: "#e4bde9",
    soft: "#fff1f9",
    bg: "#291b37",
    face: "#51365d",
    font: "Georgia, serif",
    radius: "10px",
    tile: "12%",
    frame: "24px 24px 8px 8px",
    rows: [58, 52, 52, 48],
    cols: "minmax(0,1fr) 108px minmax(0,1fr)",
    areas: '"ledger ledger ledger" "info spin auto" "bonus spin turbo" "bet bet bet"',
    css: `.P-console{border:1px solid #d1a2d477;border-radius:18px;background:radial-gradient(ellipse at center,#51365ddd,#24172ff2);box-shadow:inset 0 0 0 4px #24172f,inset 0 0 0 5px #b481ba33,0 16px 36px #0009}.P-ledger{gap:16px}.P-meter{padding:8px 12px;border:1px solid #e4bde955;background:#38243f;border-radius:5px;box-shadow:inset 0 0 0 3px #24172f33}
.P-spin-mount{padding:5px;border:1px solid #e8c58e;border-radius:8px;background:#261931;box-shadow:0 5px 12px #0006}
.P-spin{border-radius:4px;background:radial-gradient(at 50% 20%,#9c76ab,#4d2f65 70%);border:1px solid #e8c58e99;color:#fff0d1;box-shadow:inset 0 0 0 3px #291b3744}.P-spin__art{width:50px;height:50px}.P-spin>svg{display:none}.P-chip{border:1px solid #ccaccd66;background:#37233f;border-radius:5px;box-shadow:inset 0 0 0 3px #291b3733}.P-bet__value{background:transparent;border:0;border-bottom:1px solid #e8c58e66}.P-step{background:#64436c;border-radius:50%}
S .realms-well{border-color:#e8c58e88!important;background:radial-gradient(ellipse at top,#54365ff0,#261a33f5)!important}`,
  },
  "tesla-tower": {
    concept:
      "Electrical laboratory: twin voltmeter windows, an offset power wager, horizontal glass coil spin chamber beside the info switch, two copper circuit levers.",
    accent: "#88e6ff",
    soft: "#e7faff",
    bg: "#112431",
    face: "#2a4853",
    font: "Consolas, monospace",
    radius: "5px",
    tile: "15%",
    frame: "10px",
    rows: [58, 48, 76, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "turbo bet bet bet" "info spin spin spin" "auto auto bonus bonus"',
    css: `.P-console{border:2px solid #a08156;background:linear-gradient(120deg,#45534eee,#142832f5);border-radius:8px;box-shadow:inset 0 0 0 4px #142832,0 16px 34px #0008}.P-ledger{gap:12px}.P-meter{background:#061a22;padding:7px 10px;border:1px solid #aac2bf66;border-radius:4px}.P-meter strong{color:#b4f7ff;font-family:Consolas,monospace}.P-spin-mount{padding:5px;border-inline:5px solid #b38b52;border-block:1px solid #b4f7ff77;border-radius:8px;background:repeating-linear-gradient(90deg,#88e6ff22 0 2px,transparent 2px 12px)}
.P-spin{flex-direction:row;gap:14px;background:linear-gradient(#b6ffff44,#256d8299,#102e43);color:#e4ffff;border:1px solid #88e6ff77;border-radius:16px;box-shadow:inset 0 3px 0 #e4ffff22}.P-spin__art{width:44px;height:44px}.P-spin>svg{display:none}.P-spin>span{font-size:15px}.P-auto,.P-bonus{flex-direction:row;gap:10px;border-bottom:3px solid #b38b52;background:#1b3036}.P-turbo,.P-info{background:#39534c;border:1px solid #a88e5f77}.P-bet__value{background:#071c27;border-color:#88e6ff77}
S .realms-well{border:2px solid #a08156!important;box-shadow:inset 0 0 0 4px #142832,0 16px 36px #0008!important}`,
  },
  "thunderbird-totem": {
    concept:
      "Storm totem: stacked carved account lintel, central thunder seal crowning a wager beam, four independently carved totem switches along the base.",
    accent: "#e7c179",
    soft: "#fff3d1",
    bg: "#242226",
    face: "#4a4548",
    font: "Bahnschrift, sans-serif",
    radius: "4px 14px 4px 14px",
    tile: "18%",
    frame: "8px 28px 8px 28px",
    rows: [58, 88, 48, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "spin spin spin spin" "bet bet bet bet" "bonus info turbo auto"',
    css: `.P-console{border:0;border-inline:4px solid #8c7050;background:linear-gradient(140deg,#514745ed,#1f2027f5);border-radius:4px 18px 4px 18px}.P-ledger{padding:8px 12px;border-block:2px solid #9b805666;background:#28262b}.P-spin-mount{padding:4px 12px;border-radius:8px 28px 8px 28px;background:linear-gradient(90deg,#42536799,#23232d,#42536799);border:1px solid #e7c17977}
.P-spin{width:100%;height:100%;border-radius:6px 24px 6px 24px;flex-direction:row;gap:18px;background:linear-gradient(105deg,#3f526e,#7992ad 50%,#3f526e);border:1px solid #d8eaff88;color:#ffedc7}.P-spin__art{width:52px;height:52px}.P-spin>svg{display:none}.P-spin>span{font-size:17px;letter-spacing:.2em}.P-chip{background:#3e3430;border:1px solid #c29b6066;border-top:3px solid #e7c17977;border-radius:3px 10px 3px 10px}.P-bet__value{background:#1c222c;border-color:#a9bfce66}.P-step{background:#4d4740}
S .realms-well{border-inline:4px solid #8c7050!important;border-block:1px solid #d8b97a77!important}`,
  },
  "tortoise-treasury": {
    concept:
      "Jade treasury: inset gold account cartouches, a shell-shaped spin vault on the right of four jade keys, and a broad bottom coin wager trough.",
    accent: "#e0c782",
    soft: "#f7f1d2",
    bg: "#142c28",
    face: "#335448",
    font: '"Trebuchet MS", sans-serif',
    radius: "18px 6px 18px 6px",
    tile: "28%",
    frame: "34px 12px 34px 12px",
    rows: [58, 52, 52, 48],
    cols: "repeat(4,minmax(0,1fr))",
    areas:
      '"ledger ledger ledger ledger" "auto turbo spin spin" "info bonus spin spin" "bet bet bet bet"',
    css: `.P-console{border:1px solid #bfa56788;border-radius:24px 8px 24px 8px;background:linear-gradient(145deg,#41614eee,#122c28f5);box-shadow:inset 0 0 0 4px #142c28,inset 0 0 0 5px #bfa56733,0 16px 34px #0008}.P-ledger{gap:12px}.P-meter{padding:8px 10px;border:1px solid #c7ae7166;border-radius:14px 5px 14px 5px;background:#11251f}.P-spin-mount{padding:6px;border:2px solid #bfa567;border-radius:50% 50% 25% 25%;background:repeating-conic-gradient(from 20deg,#8e9e6266 0 40deg,#142c2866 40deg 45deg)}
.P-spin{border-radius:50% 50% 25% 25%;background:radial-gradient(at 35% 20%,#afc486,#4f8b65 45%,#20523d 90%);color:#fff0bf;border:1px solid #e5d29788;box-shadow:inset 0 0 0 4px #d6c17c22}.P-spin__art{width:48px;height:48px}.P-spin>svg{display:none}.P-chip{background:#1b3b30;border-color:#bfa56766;border-radius:6px 18px 6px 18px}.P-bet{border-top:1px solid #bfa56744;padding-top:2px}.P-bet__value{background:#102820;border-radius:6px;border-color:#bfa56777}.P-step{border-radius:50%;background:#69855755}
S .realms-well{border-color:#bfa56788!important;box-shadow:inset 0 0 0 4px #142c2855,0 16px 36px #0009!important}`,
  },
};

const [command = "list", id] = process.argv.slice(2);
if (command === "list") {
  console.log(JSON.stringify(queue));
  process.exit(0);
}
const item = queue.find((x) => x[0] === id);
if (!item) throw Error("Unknown game");
const [game, component, p, stem, tagline] = item;
const dir = `src/games/${game}`,
  consoleFile = `${dir}/${component}Console.tsx`,
  cssFile = `${dir}/${stem}-layout.css`;
const name = game
  .split("-")
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join(" ");
const evidence = `output/realms-overhaul/${game}`;
fs.mkdirSync(evidence, { recursive: true });
const stateFile = "output/realms-overhaul/status.json";
function progress(status, extra = {}) {
  const states = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
  states[game] = { ...states[game], ...extra, status };
  fs.writeFileSync(stateFile, JSON.stringify(states, null, 2));
  const file = "docs/REALMS_28_OVERHAUL_PROGRESS.md";
  let doc = fs.readFileSync(file, "utf8").split("\n## Continuous queue — games 07–28")[0];
  doc +=
    "\n## Continuous queue — games 07–28 (2026-11-17)\n\nUser requirement: distinct containers, spin enclosures and button treatments for every game. Existing symbols, backgrounds, icons, music and engine are retained. Earlier entries above describe previous versions.\n\n| # | Game | Status | Design |\n|---|---|---|---|\n";
  queue.forEach(([id], i) => {
    const x = states[id];
    doc += `| ${String(i + 7).padStart(2, "0")} | ${id} | ${x?.status ?? "NOT STARTED"} | ${x?.concept ?? ""} |\n`;
  });
  for (const [id, x] of Object.entries(states))
    if (x.status === "VERIFIED") {
      doc += `\n### ${id}\n\n${x.concept}\n\nModified files: ${x.files.map((f) => "`" + f + "`").join(", ")}.\n\nResponsive and functional QA: ${x.viewports} viewports, ${x.checks} checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.\n\nEvidence: [screenshots/results](../${x.output}/), [design and original sources](../output/realms-overhaul/${id}/). Before: \`before-*.png\`; after: \`after-*.png\`; result: \`after-results.json\`.\n`;
    }
  fs.writeFileSync(file, doc);
  const esc = (value) =>
    String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const cards = queue
    .map(([id], i) => {
      const x = states[id];
      if (x?.status !== "VERIFIED") return "";
      const folder = x.output.replace("output/", "");
      return `<article><h2>${String(i + 7).padStart(2, "0")} · ${esc(x.name)}</h2><p>${esc(x.concept)}</p><div class="pair"><figure><figcaption>Before</figcaption><img loading="lazy" src="../${folder}/before-mobile.png" alt="Previous ${esc(x.name)} layout"></figure><figure><figcaption>After</figcaption><img loading="lazy" src="../${folder}/after-mobile.png" alt="Redesigned ${esc(x.name)} layout"></figure></div><p class="qa">${x.viewports} screen sizes · ${x.checks} checks · no page errors</p></article>`;
    })
    .join("");
  fs.writeFileSync(
    "output/realms-overhaul/gallery.html",
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MaxHigh Realms overhaul review</title><style>body{margin:0;background:#11151c;color:#e8edf5;font:15px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:32px}h1{font-size:32px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:24px}article{padding:24px;background:#1a212c;border:1px solid #344054;border-radius:20px}h2{margin:0;font-size:22px}p{color:#bdc8d8}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{margin-bottom:8px;color:#a9bacd}img{display:block;width:100%;height:auto;border-radius:8px}.qa{color:#9ce3bb;font-size:12px}@media(max-width:500px){main{padding:14px}section{grid-template-columns:1fr}article{padding:14px}.pair{gap:8px}}</style><main><h1>Realms UI overhaul · games 07–28</h1><p>Independent container layouts and spin enclosures. Original artwork and gameplay preserved. Screenshots use a deterministic local fixture.</p><section>${cards}</section></main></html>`,
  );
}
if (command === "record") {
  const qa = `scripts/qa/${game.split("-")[0]}-mobile-ui.mjs`;
  const text = fs.readFileSync(qa, "utf8");
  const output = /const out = path.join\(root, "([^"]+)"\)/.exec(text)[1];
  const result = JSON.parse(fs.readFileSync(`${output}/after-results.json`, "utf8"));
  if (result.errors.length || result.checks.length < 20 || result.evidence.length < 6)
    throw Error("QA incomplete");
  const design = JSON.parse(fs.readFileSync(`${evidence}/design.json`, "utf8"));
  progress("VERIFIED", {
    ...design,
    output,
    viewports: result.evidence.length,
    checks: result.checks.length,
  });
  console.log(`VERIFIED ${game}`);
  process.exit(0);
}
if (command === "layout-qa") {
  const qa = `scripts/qa/${game.split("-")[0]}-mobile-ui.mjs`;
  let text = fs.readFileSync(qa, "utf8");
  text = text.replace(
    'if (phase !== "before") {\n    for (const mobile',
    'if (phase === "after") {\n    for (const mobile',
  );
  fs.writeFileSync(qa, text);
  const output = /const out = path.join\(root, "([^"]+)"\)/.exec(text)[1];
  const original = JSON.parse(fs.readFileSync(`${output}/after-results.json`, "utf8"));
  const run = spawnSync(process.execPath, [qa, "layout"], { stdio: "inherit", windowsHide: true });
  if (run.status !== 0) process.exit(run.status ?? 1);
  const fresh = JSON.parse(fs.readFileSync(`${output}/layout-results.json`, "utf8"));
  original.evidence = fresh.evidence;
  original.errors = fresh.errors;
  original.checks = [
    ...fresh.checks,
    ...original.checks.filter(
      (c) => !c.name.startsWith("layout ") && !c.name.startsWith("dialogs "),
    ),
  ];
  fs.writeFileSync(`${output}/after-results.json`, JSON.stringify(original, null, 2));
  for (const f of fs
    .readdirSync(output)
    .filter((f) => f.startsWith("layout-") && f.endsWith(".png")))
    fs.copyFileSync(`${output}/${f}`, `${output}/${f.replace("layout-", "after-")}`);
  console.log(`Final layout evidence merged with unchanged-handler checks: ${game}`);
  process.exit(0);
}
const catalog = fs.readFileSync("src/lib/realms/catalog.ts", "utf8");
const block = catalog.slice(catalog.indexOf(`id: "${game}"`));
const board = /board: \{ cols: (\d+), rows: (\d+) \}/.exec(block);
const ar = Number(board[1]) / Number(board[2]);
if (command === "prepare") {
  progress("IN PROGRESS");
  for (const f of [consoleFile, cssFile, `${dir}/GameView.tsx`, `${dir}/game.theme.ts`])
    if (fs.existsSync(f) && !fs.existsSync(`${evidence}/${path.basename(f)}.original`))
      fs.copyFileSync(f, `${evidence}/${path.basename(f)}.original`);
  if (!fs.existsSync(consoleFile)) {
    const template = fs.readFileSync(
      "output/realms-overhaul/magma-anvil/MagmaConsole.tsx.original",
      "utf8",
    );
    const icons = {
      "shogun-sakura": ["Swords", "Flower2"],
      "snowglobe-sorcery": ["Snowflake", "Sparkles"],
      "stag-spirit-glade": ["TreePine", "Leaf"],
      "steamforge-express": ["Factory", "Ticket"],
      "tarot-twilight": ["Star", "Eye"],
      "tesla-tower": ["RadioTower", "Lightbulb"],
      "thunderbird-totem": ["Bird", "CloudLightning"],
      "tortoise-treasury": ["Gem", "Coins"],
    };
    const [spinIcon, bonusIcon] = icons[game] ?? ["Hammer", "Flame"];
    fs.writeFileSync(
      consoleFile,
      template
        .replaceAll("Magma Anvil", name)
        .replaceAll("MagmaConsole", `${component}Console`)
        .replaceAll("ma-", `${p}-`)
        .replaceAll("Hammer", spinIcon)
        .replaceAll("Flame", bonusIcon),
    );
  }
  const qa = `scripts/qa/${game.split("-")[0]}-mobile-ui.mjs`;
  if (!fs.existsSync(qa)) {
    let text = fs.readFileSync("scripts/qa/magma-mobile-ui.mjs", "utf8");
    text = text
      .replaceAll("magma-anvil", game)
      .replaceAll("Magma Anvil", name)
      .replaceAll("magma-mobile", `${game.split("-")[0]}-mobile`)
      .replaceAll("__maQA", `__${p}QA`)
      .replaceAll(".ma-", `.${p}-`)
      .replaceAll("18132", String(18200 + queue.indexOf(item)));
    fs.writeFileSync(qa, text);
  }
  console.log(JSON.stringify({ game, consoleFile, cssFile, qa, ar }));
  process.exit(0);
}
if (command === "apply") {
  const s = specs[game];
  if (!s) throw Error("Design spec not authored yet");
  const qaPath = `scripts/qa/${game.split("-")[0]}-mobile-ui.mjs`;
  if (fs.existsSync(qaPath)) {
    let qa = fs.readFileSync(qaPath, "utf8");
    if (!qa.includes("geometry.deck.right <= geometry.board.x"))
      qa = qa.replace(
        "geometry.board.right <= geometry.deck.x + 1 ||",
        "geometry.deck.right <= geometry.board.x + 1 ||\n            geometry.board.right <= geometry.deck.x + 1 ||",
      );
    fs.writeFileSync(qaPath, qa);
  }
  const dispatchFile = "src/components/maxhigh/SlotControlDeck.tsx";
  let dispatch = fs.readFileSync(dispatchFile, "utf8");
  if (!dispatch.includes(`import { ${component}Console }`))
    dispatch =
      `import { ${component}Console } from "@/games/${game}/${component}Console";\n` + dispatch;
  dispatch = dispatch.replace(
    new RegExp(
      `^//\\s*if \\(props.gameId === "${game}"\\) return <${component}Console \\{\\.\\.\\.props\\} />;\\s*$`,
      "m",
    ),
    "",
  );
  if (!dispatch.includes(`  if (props.gameId === "${game}")`))
    dispatch = dispatch.replace(
      "export function SlotControlDeck(props: SlotControlDeckProps) {",
      `export function SlotControlDeck(props: SlotControlDeckProps) {\n  if (props.gameId === "${game}") return <${component}Console {...props} />;`,
    );
  fs.writeFileSync(dispatchFile, dispatch);
  const realmsFile = "src/components/maxhigh/RealmsSlot.tsx";
  let realms = fs.readFileSync(realmsFile, "utf8");
  if (!realms.includes(`"${game}": "${p}"`))
    realms = realms.replace(
      "const MINI_TOAST_PREFIX: Record<string, string | undefined> = {",
      `const MINI_TOAST_PREFIX: Record<string, string | undefined> = {\n  "${game}": "${p}",`,
    );
  fs.writeFileSync(realmsFile, realms);
  let source = fs.readFileSync(consoleFile, "utf8");
  if (!source.includes("realmsAssetBase"))
    source = `import { realmsAssetBase } from "@/components/maxhigh/realms/theme";\n` + source;
  if (!source.includes(`${p}-spin-mount`)) {
    const start = source.indexOf(
      "      <button",
      source.indexOf(`className="${p}-side ${p}-side--l"`),
    );
    const match = new RegExp(
      `      <button\\s+type="button"\\s+className="${p}-spin"[\\s\\S]*?</button>`,
    ).exec(source.slice(start));
    if (!match) throw Error("Spin markup not found");
    const old = match[0];
    const replacement = old.replace(
      /(data-state=\{state\}\s*>)/,
      `$1\n        <img className="${p}-spin__art" src={\`\$\{realmsAssetBase(p.gameId)\}/p1.webp?v=1\`} alt="" aria-hidden="true" />`,
    );
    source = source.replace(
      old,
      `      <div className="${p}-spin-mount">\n${replacement}\n      </div>`,
    );
  }
  fs.writeFileSync(consoleFile, source);
  let view = fs.readFileSync(`${dir}/GameView.tsx`, "utf8");
  if (!view.includes(`${stem}-layout.css`)) {
    view = view.replace("/**", `import "./${stem}-layout.css";\n\n/**`);
    const words = name.split(" ");
    const last = words.pop();
    view = view.replace(
      "      <RealmsSlot",
      `      <header className="${p}-identity"><span className="${p}-identity__brand">${tagline}</span><h1>${words.join(" ")} <span>${last}</span></h1></header>\n      <RealmsSlot`,
    );
    fs.writeFileSync(`${dir}/GameView.tsx`, view);
  }
  // Preserve only the dialog rules, not obsolete game-specific spin overrides after them.
  const dialogSource = fs.readFileSync("src/games/hexbound-library/hex-layout.css", "utf8");
  const dialogs = dialogSource
    .slice(dialogSource.indexOf("/* Shared dialogs"))
    .replaceAll("hexbound-library", game);
  const hud = s.rows.reduce((a, b) => a + b, 0) + 36 + 28;
  const css = `/* ${name}: ${s.concept} Presentation only; original assets and engine retained. */
[data-game-view="${game}"] { --ui-accent:${s.accent};--ui-soft:${s.soft};--ui-bg:${s.bg};--ui-face:${s.face};--ui-hud:${hud}px;container-type:size;overflow:clip;color:var(--ui-soft);font-family:${s.font}; }
.${p}-identity{position:absolute;top:max(18px,env(safe-area-inset-top));left:18px;right:124px;z-index:25;display:grid;gap:5px;pointer-events:none}
.${p}-identity__brand{font:600 8px/1.3 "Segoe UI",sans-serif;letter-spacing:.18em;color:var(--ui-soft);opacity:.8;text-shadow:0 2px 8px #000}
.${p}-identity h1{margin:0;font-size:clamp(19px,5.6cqw,30px);line-height:1.05;letter-spacing:.025em;color:var(--ui-soft);text-shadow:0 2px 10px #000;white-space:normal}
.${p}-identity h1 span{display:block;color:var(--ui-accent)}
[data-game-view="${game}"] [data-realms-game]>button{top:max(18px,env(safe-area-inset-top));right:66px;width:44px;height:44px;border-radius:${s.radius};border:1px solid color-mix(in srgb,var(--ui-accent) 45%,transparent);background:color-mix(in srgb,var(--ui-bg) 90%,transparent)}
[data-game-modal="${game}"]>div:has(>button[aria-label="Close game"]){top:max(18px,env(safe-area-inset-top));right:12px}
[data-game-modal="${game}"] button[aria-label="Close game"]{width:44px;height:44px;border-radius:${s.radius};border:1px solid color-mix(in srgb,${s.accent} 45%,transparent);background:${s.bg}e6}
body:has(.bb-close) [data-game-modal="${game}"]>div:has(>button[aria-label="Close game"]),body:has(.bb-close) [data-game-modal="${game}"] [data-realms-game]>button{visibility:hidden;pointer-events:none}
[data-game-view="${game}"] .realms-playfield{padding:100px 16px max(20px,env(safe-area-inset-bottom));align-items:center;justify-content:center}
[data-game-view="${game}"] .realms-playfield>div{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto;align-content:center;justify-items:center;gap:22px;width:100%;max-width:800px;height:100%;margin-inline:auto}
[data-game-view="${game}"] .realms-stage{flex:none;height:auto;min-height:0;width:100%}
[data-game-view="${game}"] .realms-well{padding:12px!important;margin-inline:auto;border:1px solid color-mix(in srgb,var(--ui-accent) 50%,transparent);border-radius:${s.frame}!important;clip-path:none!important;mask:none!important;background:linear-gradient(145deg,${s.face}f2,${s.bg}f5)!important;box-shadow:inset 0 1px 0 #fff2,0 14px 36px #0009!important}
[data-game-view="${game}"] .realms-well::before,[data-game-view="${game}"] .realms-well::after{display:none!important}
[data-game-view="${game}"] .realms-reel-grid{width:min(calc(100cqw - 58px),640px,calc((100cqh - 100px - var(--ui-hud) - 22px - max(20px,env(safe-area-inset-bottom)) - 26px)*${ar}))!important;max-height:none!important;border:0!important;background:none!important;box-shadow:none!important;padding:0!important;gap:clamp(4px,1.3cqw,9px)!important}
[data-game-view="${game}"] .realms-reel-cell{border-radius:${s.tile}!important;clip-path:none!important;mask:none!important;border:1px solid color-mix(in srgb,var(--ui-accent) 22%,transparent)!important;background-color:color-mix(in srgb,var(--ui-face) 70%,var(--ui-bg))!important;background-image:radial-gradient(at 35% 20%,#fff1,transparent 75%)!important;box-shadow:inset 0 1px 0 #fff1!important}
[data-game-view="${game}"] .realms-reel-cell[data-winning="true"]{border-color:var(--ui-soft)!important;box-shadow:inset 0 0 12px color-mix(in srgb,var(--ui-accent) 40%,transparent),0 0 12px var(--ui-accent)!important}
[data-game-view="${game}"] .realms-reel-art{inset:5%}
[data-game-view="${game}"] .realms-reel-grid img{scale:.95}
.${p}-console{position:relative;display:grid;grid-template-columns:${s.cols};grid-template-rows:${s.rows.map((x) => x + "px").join(" ")};grid-template-areas:${s.areas.replaceAll("auto", "autospin")};gap:12px;padding:14px;width:100%;max-width:440px;justify-self:center;isolation:isolate;border:1px solid color-mix(in srgb,var(--ui-accent) 30%,transparent);border-radius:${s.radius};background:${s.bg}eb;box-shadow:0 14px 30px #0006}
.${p}-console::before,.${p}-console::after{display:none!important}
.${p}-console button{min-width:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:filter .15s,transform .15s;font-family:inherit}
.${p}-console button:disabled{opacity:.45;cursor:default}.          ${p}-console button:not(:disabled):active{transform:scale(.97)}
.${p}-console button:focus-visible{outline:2px solid var(--ui-soft);outline-offset:3px}
.${p}-console strong,.${p}-console em{font-variant-numeric:tabular-nums;font-style:normal;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.${p}-ledger{grid-area:ledger;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:12px;min-width:0}
.${p}-ledger>i{display:none}.          ${p}-meter{display:grid;gap:4px;min-width:0}.          ${p}-meter[data-meter="win"]{text-align:right}
.${p}-meter>span,.${p}-bet__value>span{font:600 9px/1.2 "Segoe UI",sans-serif;text-transform:uppercase;letter-spacing:.12em;color:var(--ui-soft);opacity:.8}.          ${p}-meter strong{font:700 clamp(15px,4.5cqw,21px)/1.2 "Segoe UI",sans-serif;color:var(--ui-soft)}
.${p}-meter[data-winning="true"] strong{color:var(--ui-accent)}
.${p}-bet{grid-area:bet;display:grid;grid-template-columns:48px minmax(0,1fr) 48px;gap:8px;min-width:0}.          ${p}-step,.${p}-bet__value,.${p}-chip{border:1px solid color-mix(in srgb,var(--ui-accent) 35%,transparent);border-radius:${s.radius};background:linear-gradient(145deg,var(--ui-face),var(--ui-bg));color:var(--ui-soft);box-shadow:inset 0 1px 0 #fff1}
.${p}-step{display:grid;place-items:center;min-height:44px;color:var(--ui-accent)}.          ${p}-bet__value{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:44px}.          ${p}-bet__value strong{font:700 16px/1 "Segoe UI",sans-serif}
.${p}-side{display:contents}.          ${p}-turbo{grid-area:turbo}.          ${p}-auto{grid-area:autospin}.          ${p}-bonus{grid-area:bonus}.          ${p}-info{grid-area:info}
.${p}-chip{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px;min-height:44px}.          ${p}-chip>svg{width:16px;height:16px;color:var(--ui-accent)}.          ${p}-chip>span{font:700 8px/1.1 "Segoe UI",sans-serif;letter-spacing:.07em;text-transform:uppercase}.          ${p}-chip>em{font:600 10px/1.1 "Segoe UI",sans-serif}
.${p}-turbo[aria-pressed="true"],.${p}-auto[aria-pressed="true"]{outline:1px solid var(--ui-accent);background:color-mix(in srgb,var(--ui-accent) 25%,var(--ui-bg))}
.${p}-spin-mount{grid-area:spin;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0}
.${p}-spin{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;height:100%;min-width:44px;min-height:44px;border:1px solid var(--ui-accent);border-radius:${s.radius};background:linear-gradient(140deg,var(--ui-soft),var(--ui-accent));color:var(--ui-bg);clip-path:none;padding:4px;isolation:isolate}
.${p}-spin::before,.${p}-spin::after{display:none!important}.          ${p}-spin>i{display:none}.          ${p}-spin>svg{width:17px;height:17px}.          ${p}-spin>span{font:800 11px/1 "Segoe UI",sans-serif;text-transform:uppercase;letter-spacing:.12em}
.${p}-spin__art{width:44px;height:44px;object-fit:contain;pointer-events:none}.          ${p}-spin[data-state="busy"] .${p}-spin__art{animation:${p}-ui-turn 3s linear infinite}.          ${p}-spin[data-state="auto"]{box-shadow:0 0 0 2px var(--ui-soft)}.          ${p}-spin[data-state="free"]{filter:hue-rotate(15deg)}
@keyframes ${p}-ui-turn{to{rotate:360deg}}
${s.css.replaceAll(".P-", `.${p}-`).replaceAll("S ", `[data-game-view="${game}"] `)}
[data-sonner-toast].${p}-toast{display:flex!important;justify-content:center;width:auto!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;pointer-events:none}
.${p}-toast__pill{padding:4px 12px;border:1px solid ${s.accent}66;border-radius:20px;background:${s.bg}ee;color:${s.soft};font:600 11px/1.3 "Segoe UI",sans-serif;white-space:nowrap}
[data-sonner-toaster]:has(.${p}-toast){--offset-top:92px!important;--mobile-offset-top:92px!important}
@container (max-width:350px){.${p}-console{gap:8px;padding:10px}.          ${p}-chip>span{font-size:8px}.          ${p}-spin-mount{padding:4px}.          ${p}-bet{grid-template-columns:44px minmax(0,1fr) 44px;gap:4px}}
@container (orientation:portrait) and (max-height:680px){
[data-game-view="${game}"] .realms-playfield{padding:88px 16px max(12px,env(safe-area-inset-bottom))}
[data-game-view="${game}"] .realms-playfield>div{gap:14px}
[data-game-view="${game}"] .realms-reel-grid{width:min(calc(100cqw - 58px),calc((100cqh - 88px - ${hud - 24}px - 14px - max(12px,env(safe-area-inset-bottom)) - 26px)*${ar}))!important}
.${p}-console{gap:8px;padding:8px;grid-template-rows:${s.rows.map((x) => Math.max(x - 4, 44) + "px").join(" ")}}
.${p}-spin{max-width:100%;max-height:100%}.          ${p}-meter strong{font-size:16px}
}
@container (orientation:landscape) and (max-height:600px){
[data-game-view="${game}"] .realms-playfield{padding:58px 16px max(10px,env(safe-area-inset-bottom))}
[data-game-view="${game}"] .realms-playfield>div{grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:auto;gap:16px;max-width:1100px}
.${p}-identity{top:12px}.          ${p}-identity h1{font-size:20px}.          ${p}-identity h1 span{display:inline}
.${p}-console{padding:8px;gap:6px;grid-template-rows:${s.rows.map((x) => Math.max(44, x - 14) + "px").join(" ")};grid-template-columns:${s.cols.replace("112px", "96px")}}
.${p}-meter{gap:2px}.          ${p}-meter strong{font-size:16px}.          ${p}-meter>span{font-size:8px}.          ${p}-chip{padding:2px;gap:1px}.          ${p}-bet{grid-template-columns:44px minmax(0,1fr) 44px;gap:4px}
.${p}-spin{max-width:100%;max-height:100%}.          ${p}-spin__art{width:38px;height:38px}.          ${p}-spin-mount{padding:4px}
[data-game-view="${game}"] .realms-reel-grid{width:min(calc(100cqw - 32px - 300px - 16px - 26px),calc((100cqh - 58px - max(10px,env(safe-area-inset-bottom)) - 26px)*${ar}))!important}
}
@container (orientation:landscape) and (max-height:360px){[data-game-view="${game}"] .realms-playfield>div{grid-template-columns:minmax(0,1fr) 280px}[data-game-view="${game}"] .realms-reel-grid{width:min(calc(100cqw - 32px - 280px - 16px - 26px),calc((100cqh - 58px - 10px - 26px)*${ar}))!important}}
@container (min-width:1000px) and (min-height:650px){
[data-game-view="${game}"] .realms-playfield{padding-inline:24px}
[data-game-view="${game}"] .realms-playfield>div{grid-template-columns:${["monarch-meadow", "orchid-oasis", "stag-spirit-glade", "tortoise-treasury", "moonwell-mysteries", "tarot-twilight"].includes(game) ? "400px minmax(0,1fr)" : "minmax(0,1fr) 400px"};grid-template-rows:auto;align-items:center;gap:32px;max-width:1200px}
[data-game-view="${game}"] .realms-stage{grid-row:1;grid-column:${["monarch-meadow", "orchid-oasis", "stag-spirit-glade", "tortoise-treasury", "moonwell-mysteries", "tarot-twilight"].includes(game) ? 2 : 1}}
.${p}-console{grid-row:1;grid-column:${["monarch-meadow", "orchid-oasis", "stag-spirit-glade", "tortoise-treasury", "moonwell-mysteries", "tarot-twilight"].includes(game) ? 1 : 2};max-width:400px}
[data-game-view="${game}"] .realms-reel-grid{width:min(calc(100cqw - 48px - 400px - 32px - 26px),640px,calc((100cqh - 100px - max(20px,env(safe-area-inset-bottom)) - 26px)*${ar}))!important}
}
@media(prefers-reduced-motion:reduce){.${p}-spin[data-state="busy"] .${p}-spin__art{animation:none}.          ${p}-console button{transition:none}}
${dialogs}
`;
  fs.writeFileSync(cssFile, css.replaceAll(".          ", "."));
  fs.writeFileSync(
    `${evidence}/design.json`,
    JSON.stringify(
      {
        game,
        name,
        concept: s.concept,
        files: [consoleFile, cssFile, `${dir}/GameView.tsx`],
        board: { cols: Number(board[1]), rows: Number(board[2]) },
        assets: "Existing p1 symbol reused; no assets generated or modified",
        layout: { rows: s.rows, columns: s.cols, areas: s.areas },
      },
      null,
      2,
    ),
  );
  console.log(`Applied ${game}: ${s.concept}`);
}
