"""
Apply scripts/panther-calibration.json to the 30 Panther configs.

For each title:
  - new defaults: pay table, scatter weight, Ante scatter boost, Buy price
  - the old defaults become legacy values, so a stored DB config that still has
    them (never customised) migrates onto the calibrated math on load;
    customised values are left alone
  - writes src/components/maxhigh/panther-shared/buy-curve.ts

    python scripts/apply-panther-calibration.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "scripts/panther-calibration.json").read_text(encoding="utf-8"))
PAY_IDS = ["grape", "plum", "melon", "apple", "blue", "green", "purple", "heart"]


def fmt(n: float) -> str:
    return f"{n:g}"


def once(s: str, a: str, b: str, label: str) -> str:
    assert s.count(a) == 1, (label, a[:80], s.count(a))
    return s.replace(a, b)


def set_default_pays(s: str, pays: list, label: str) -> str:
    """Rewrite `pay: [...]` on each default symbol line of the DEFAULT config."""
    start = s.index("export const DEFAULT_")
    end = s.index("\n};", start)
    block = s[start:end]
    for sid, pay in zip(PAY_IDS, pays):
        pat = re.compile(r'(\{ id: "%s", kind: "%s",[^\n]*?pay: \[)[^\]]*(\])' % (sid, sid))
        block, n = pat.subn(lambda m: m.group(1) + ", ".join(fmt(p) for p in pay) + m.group(2), block, count=1)
        assert n == 1, (label, "pay", sid)
    return s[:start] + block + s[end:]


def set_default_scalar(s: str, key: str, value: float, label: str) -> str:
    start = s.index("export const DEFAULT_")
    end = s.index("\n};", start)
    block = s[start:end]
    block, n = re.subn(r"(\n  %s: )[\d._]+(,)" % key, lambda m: m.group(1) + fmt(value) + m.group(2), block, count=1)
    assert n == 1, (label, key)
    return s[:start] + block + s[end:]


def set_scatter_weight(s: str, weight: float, label: str) -> str:
    start = s.index("export const DEFAULT_")
    end = s.index("\n};", start)
    block = s[start:end]
    block, n = re.subn(r'(id: "lollipop",[\s\S]*?weight: )[\d.]+', lambda m: m.group(1) + fmt(weight), block, count=1)
    assert n == 1, (label, "scatter weight")
    return s[:start] + block + s[end:]


curves = []
for r in DATA:
    gid = r["id"]
    path = ROOT / f"src/lib/{gid}-config.ts"
    s = path.read_text(encoding="utf-8")
    if "PRE_CALIBRATION_" in s:
        print("skip (already applied)", gid)
        continue
    old, new = r["old"], r["new"]
    wild = gid == "wild-panther"
    buy = round(new["buyCurve"][9] * 10 * 2) / 2 if wild else new["buyFeatureMult"]  # WP sells a 10-spin package

    s = set_default_pays(s, new["pays"][:8], gid)
    s = set_scatter_weight(s, new["scatterWeight"], gid)
    s = set_default_scalar(s, "anteScatterWeightMult", new["anteScatterWeightMult"], gid)
    s = set_default_scalar(s, "buyFeatureMult", buy, gid)

    # legacy constants for stored configs that still carry the pre-calibration defaults
    legacy = (
        "\n/**\n * Pre-calibration defaults (2026-10). A stored config that still has these was\n"
        " * never customised, so normalize moves it onto the calibrated defaults above.\n */\n"
        f"const PRE_CALIBRATION_SCATTER_WEIGHT = {fmt(old['scatterWeight'])};\n"
        f"const PRE_CALIBRATION_ANTE_SCATTER_MULT = {fmt(old['anteScatterWeightMult'])};\n"
        f"const PRE_CALIBRATION_BUY_MULT = {fmt(old['buyFeatureMult'])};\n"
        "const PRE_CALIBRATION_PAYS: Record<string, [number, number, number]> = {\n"
        + "".join(f"  {sid}: [{', '.join(fmt(p) for p in pay)}],\n" for sid, pay in zip(PAY_IDS, old["pays"][:8]))
        + "};\n"
    )
    anchor = "function isLegacyDefaultPay("
    s = once(s, anchor, legacy.lstrip("\n") + "\n" + anchor, gid + " legacy anchor")

    # pays: treat the pre-calibration table as legacy too
    m = re.search(r"function isLegacyDefaultPay\(id: string, pay: unknown\): boolean \{\n", s)
    assert m, gid + " isLegacyDefaultPay"
    s = s[: m.end()] + "  if (PRE_CALIBRATION_PAYS[id] && paysEqual(pay, PRE_CALIBRATION_PAYS[id])) return true;\n" + s[m.end():]
    s = once(
        s,
        legacy.lstrip("\n").split("const PRE_CALIBRATION_SCATTER_WEIGHT")[0],
        legacy.lstrip("\n").split("const PRE_CALIBRATION_SCATTER_WEIGHT")[0]
        + "function paysEqual(pay: unknown, expected: [number, number, number]): boolean {\n"
        "  return Array.isArray(pay) && pay.length >= 3 && expected.every((v, i) => pay[i] === v);\n"
        "}\n\n",
        gid + " paysEqual",
    )

    # scatter weight / ante / buy
    s = once(
        s,
        "      weight: clamp(num(found.weight, def.weight), 0, 10_000),",
        "      weight: clamp(\n"
        "        num(def.scatter && found.weight === PRE_CALIBRATION_SCATTER_WEIGHT ? def.weight : found.weight, def.weight),\n"
        "        0,\n"
        "        10_000,\n"
        "      ),",
        gid + " weight",
    )
    s = once(
        s,
        "    anteScatterWeightMult: clamp(num(o.anteScatterWeightMult, d.anteScatterWeightMult), 1, 10),",
        "    anteScatterWeightMult: clamp(\n"
        "      num(\n"
        "        o.anteScatterWeightMult === PRE_CALIBRATION_ANTE_SCATTER_MULT ? d.anteScatterWeightMult : o.anteScatterWeightMult,\n"
        "        d.anteScatterWeightMult,\n"
        "      ),\n"
        "      1,\n"
        "      10,\n"
        "    ),",
        gid + " ante",
    )
    if wild:
        s = once(
            s,
            "    buyFeatureMult: clamp(num(o.buyFeatureMult, d.buyFeatureMult), 1, 10_000),",
            "    buyFeatureMult: clamp(\n"
            "      num(o.buyFeatureMult === PRE_CALIBRATION_BUY_MULT ? d.buyFeatureMult : o.buyFeatureMult, d.buyFeatureMult),\n"
            "      1,\n"
            "      10_000,\n"
            "    ),",
            gid + " buy",
        )
    else:
        s = once(
            s,
            "    if (!superBuy && v === 100) return 42.5;",
            "    if (!superBuy && (v === 100 || v === PRE_CALIBRATION_BUY_MULT)) return fallback;",
            gid + " buy",
        )
        curves.append((gid, new["buyCurve"]))
    path.write_text(s, encoding="utf-8", newline="")
    print("applied", gid, "buy", buy)

if curves:
    out = ROOT / "src/components/maxhigh/panther-shared/buy-curve.ts"
    lines = "".join(f'  "{gid}": [{", ".join(fmt(v) for v in c)}],\n' for gid, c in curves)
    out.write_text(
        "/**\n * GENERATED by scripts/calibrate-panther.ts + scripts/apply-panther-calibration.py.\n"
        " * Fair Buy Bonus price per free spin (× bet) for quantity 1, 2, 3 … (index = quantity − 1).\n */\n"
        "export const PANTHER_BUY_CURVE: Record<string, number[]> = {\n" + lines + "};\n",
        encoding="utf-8",
        newline="",
    )
    print("wrote buy-curve.ts", len(curves))
