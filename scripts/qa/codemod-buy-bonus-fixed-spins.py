"""Server + dialog codemod for the fixed 10-spin Buy Bonus. DRY-RUN by default; --apply writes.
 * server (29 template games + Realms): the client-chosen quantity (1..50 / 1..max) is replaced by resolveBuyBonusSpins(): absent or 10 is
   accepted, anything else is refused. Pricing code, per-spin curves and wallet code are NOT touched.
 * dialog (29 template games): the Quantity stepper is removed and replaced by a fixed "Free Spins" value; the bet stepper and the
   calibrated price display remain.
  python scripts/qa/codemod-buy-bonus-fixed-spins.py [--apply] [--only server|dialog] [file ...]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APPLY = "--apply" in sys.argv
only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
named = [a for a in sys.argv[1:] if not a.startswith("--") and a not in ("server", "dialog")]
IMPORT_SRV = 'import { resolveBuyBonusSpins } from "@/lib/buy-bonus";\n'
IMPORT_UI = 'import { BUY_BONUS_FREE_SPINS } from "@/lib/buy-bonus";\n'

SERVER_Q = re.compile(
    r"  const quantity = Math\.round\(data\.quantity\);\n  if \(!Number\.isFinite\(quantity\) \|\| quantity < 1 \|\| quantity > 50\) \{\n    throw new Error\(\"Invalid quantity\"\);\n  \}\n"
)
REALMS_Q = re.compile(
    r"  const quantity = Math\.round\(data\.quantity\);\n  const maxQuantity = realmsBuyMaxQuantity\(cfg\);\n  if \(!Number\.isFinite\(quantity\) \|\| quantity < 1 \|\| quantity > maxQuantity\) \{\n    throw new Error\(`Buy 1–\$\{maxQuantity\} free spins`\);\n  \}\n"
)


def add_import(s, line):
    last = None
    for mo in re.finditer(r'^import [^;]*?;\n', s, re.M | re.S):
        last = mo
    return s[: last.end()] + line + s[last.end():] if last else line + s


def server(src, is_realms):
    s = src.replace("\r\n", "\n")
    if "resolveBuyBonusSpins" in s:
        return s, "already"
    pat = REALMS_Q if is_realms else SERVER_Q
    if len(pat.findall(s)) != 1:
        return s, f"anchor x{len(pat.findall(s))}"
    if is_realms:
        s = pat.sub("  const quantity = resolveBuyBonusSpins(data.quantity);\n  const maxQuantity = realmsBuyMaxQuantity(cfg);\n  if (quantity > maxQuantity)\n    throw new Error(`This title allows at most ${maxQuantity} free spins per purchase`);\n", s, count=1)
    else:
        s = pat.sub("  const quantity = resolveBuyBonusSpins(data.quantity);\n", s, count=1)
    return add_import(s, IMPORT_SRV), "ok"


def dialog(src):
    s = src.replace("\r\n", "\n")
    if "BUY_BONUS_FREE_SPINS" in s:
        return s, "already"
    n = 0
    s, k = re.subn(r"  const \[quantity, setQuantity\] = useState\(BUY_FS_QTY_MIN\);\n", "  const quantity = BUY_BONUS_FREE_SPINS; // fixed: a purchase always awards exactly 10 free spins\n", s); n += k
    s, k = re.subn(r"  const canQtyMinus = quantity > BUY_FS_QTY_MIN;\n", "", s); n += k
    s, k = re.subn(r"  const maxQuantity = getBuyMaxQuantity\(\);\n", "", s); n += k
    s, k = re.subn(r"  const canQtyPlus = quantity < maxQuantity;\n", "", s); n += k
    s, k = re.subn(r"\n  const nudgeQty = \(dir: -1 \| 1\) => \{\n    setQuantity\([^\n]*\n  \};\n", "\n", s); n += k
    s, k = re.subn(r'            <Row label="Quantity">\n              <Stepper\n                value=\{String\(quantity\)\}\n                canMinus=\{canQtyMinus\}\n                canPlus=\{canQtyPlus\}\n                onMinus=\{\(\) => nudgeQty\(-1\)\}\n                onPlus=\{\(\) => nudgeQty\(1\)\}\n              />\n            </Row>\n',
                   '            <Row label="Free Spins">\n              <ValueBox>{quantity}</ValueBox>\n            </Row>\n', s); n += k
    s, k = re.subn(r"  getBuyMaxQuantity,\n", "", s); n += k
    if n != 7:
        return s, f"anchors {n}/7"
    return add_import(s, IMPORT_UI), "ok"


tasks = []
srv_dir = ROOT / "src" / "server" / "games"
for p in sorted(srv_dir.glob("*.server.ts")):
    t = p.read_text(encoding="utf8")
    if re.search(r"export async function \w*[Bb]uyFeature\(", t) and ("data.quantity" in t):
        tasks.append(("server", p, p.name == "realms.server.ts"))
mod_dir = ROOT / "src" / "components" / "maxhigh"
for p in sorted(mod_dir.glob("*/BuyFeatureModal.tsx")):
    t = p.read_text(encoding="utf8")
    if "nudgeQty" in t and "getBuyMaxQuantity" in t:
        tasks.append(("dialog", p, False))
if only:
    tasks = [t for t in tasks if t[0] == only]
if named:
    tasks = [t for t in tasks if any(n in str(t[1]) for n in named)]

ok = bad = 0
for kind, p, is_realms in tasks:
    src = p.read_text(encoding="utf8")
    new, status = server(src, is_realms) if kind == "server" else dialog(src)
    good = status in ("ok", "already")
    print(("OK   " if good else "SKIP ") + kind.ljust(6) + str(p.relative_to(ROOT)) + ("" if good else "  <- " + status))
    if good:
        ok += 1
        if APPLY and status == "ok":
            p.write_text(new if "\r\n" not in src else new.replace("\n", "\r\n"), encoding="utf8", newline="")
    else:
        bad += 1
print(f"{ok} matched, {bad} not matched" + (" (written)" if APPLY else " (dry run)"))
