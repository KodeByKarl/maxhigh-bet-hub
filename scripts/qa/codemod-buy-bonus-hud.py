"""Applies the Buy Bonus HUD change (FREE SPINS n/N from the server session, hidden during the scatter intro) to the slot components that
share the Panther/Buffalo template. DRY-RUN by default: prints, per file, whether every anchor matched exactly once. Use --apply to write.
Presentation only: no pricing, RTP, server session, wallet or payout code is touched.
  python scripts/qa/codemod-buy-bonus-hud.py [--apply] [file ...]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "src" / "components" / "maxhigh"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
APPLY = "--apply" in sys.argv
files = [ROOT / a for a in args] if args else sorted(p for p in ROOT.glob("*Slot.tsx") if "playBuyScatterIntro" in p.read_text(encoding="utf8"))
IMPORT = 'import { freeSpinsProgress } from "./bonus/freeSpinsProgress";\n'


CHAIN_DEP = re.compile(r"(\n(\s*)triggerModalCount,\n)(\s*fsPaused,\n)")


def add_chain_dep(s):
    """The automatic free-spin chain (a useEffect) must re-run when the purchase presentation ends. In this template the intro awaits the
    announcement while busyRef is still true, so without this dependency the first bonus spin never starts by itself (baseline defect)."""
    if re.search(r"\n\s*buyPresenting,\n\s*fsPaused,\n", s) or not CHAIN_DEP.search(s):
        return s
    return CHAIN_DEP.sub(lambda m: m.group(1) + m.group(2) + "buyPresenting,\n" + m.group(3), s, count=1)


def transform(src):
    s = src.replace("\r\n", "\n")
    report = {}
    if "freeSpinsProgress" in s:
        return add_chain_dep(s), {"already": True, "chainDep": "buyPresenting,\n" in s or None}

    # 1) state (after the free-spin counter state)
    m = re.search(r"^(\s*)const \[freeSpins, setFreeSpins\] = useState\(0\);\n", s, re.M)
    report["state"] = bool(m)
    if m:
        ind = m.group(1)
        s = s[: m.end()] + f"{ind}const [fsPlayed, setFsPlayed] = useState(0);\n{ind}/** True from the confirmed purchase until the Free Spins announcement is dismissed: the HUD counter stays hidden meanwhile. */\n{ind}const [buyPresenting, setBuyPresenting] = useState(false);\n" + s[m.end():]

    # 2) keep fsPlayed in step with every place the server-authorised session is read
    n1 = len(re.findall(r"fsSpinsPlayedRef\.current = ([A-Za-z.]+)\.fsSpinsPlayed;", s))
    s = re.sub(r"^(\s*)fsSpinsPlayedRef\.current = ([A-Za-z.]+)\.fsSpinsPlayed;\n", lambda mo: mo.group(0) + f"{mo.group(1)}setFsPlayed({mo.group(2)}.fsSpinsPlayed);\n", s, flags=re.M)
    n2 = len(re.findall(r"fsSpinsPlayedRef\.current = 0;", s))
    s = re.sub(r"^(\s*)fsSpinsPlayedRef\.current = 0;\n", lambda mo: mo.group(0) + f"{mo.group(1)}setFsPlayed(0);\n", s, flags=re.M)
    report["sessionSites"] = n1
    report["resetSites"] = n2

    # 3) deck props
    deck = re.search(r"^(\s*)inFree=\{inFree\}\n\s*freeSpins=\{freeSpins\}\n", s, re.M)
    report["deck"] = bool(deck)
    if deck:
        ind = deck.group(1)
        s = s[: deck.start()] + (
            f"{ind}inFree={{inFree && triggerModalCount == null && !buyPresenting}}\n"
            f"{ind}freeSpins={{freeSpins}}\n"
            f"{ind}freeSpinsProgress={{\n{ind}  inFree && triggerModalCount == null && !buyPresenting\n{ind}    ? freeSpinsProgress(fsPlayed, freeSpins, busy)\n{ind}    : null\n{ind}}}\n"
        ) + s[deck.end():]

    # 4) hide the counter while the purchase presentation runs
    a = re.search(r"^(\s*)setBuyOpen\(false\);\n", s, re.M)
    cnt_open = len(re.findall(r"^\s*setBuyOpen\(false\);\n", s, re.M))
    report["buyOpenSites"] = cnt_open
    # only the one inside buyFeature (the first one followed by the purchase RPC within 6 lines)
    m4 = re.search(r"^(\s*)setBuyOpen\(false\);\n((?:.*\n){0,6}?)\s*(?:setBet\(buyBet\);\n)?\s*try \{\n\s*const bought = await", s, re.M)
    report["buyStart"] = bool(m4)
    if m4:
        s = s[: m4.start()] + f"{m4.group(1)}setBuyOpen(false);\n{m4.group(1)}setBuyPresenting(true);\n" + s[m4.start() + len(f"{m4.group(1)}setBuyOpen(false);\n"):]

    # failure and completion of the purchase flow
    m5 = re.search(r'(toast\.error\(err instanceof Error \? err\.message : "Buy feature failed"\);\n)', s)
    report["buyFail"] = bool(m5)
    if m5:
        ind = re.search(r"^(\s*)toast\.error\(err instanceof Error \? err\.message : \"Buy feature failed\"\);\n", s, re.M).group(1)
        s = s[: m5.end()] + f"{ind}setBuyPresenting(false);\n" + s[m5.end():]
    m6 = re.search(r"(await playBuyScatterIntro\(gen, [^)]*\);\n(?:.*\n){0,6}?\s*\} finally \{\n)", s)
    report["buyDone"] = bool(m6)
    if m6:
        ind = re.search(r"\} finally \{\n(\s*)", s[m6.start():]).group(1)
        s = s[: m6.end()] + f"{ind}setBuyPresenting(false);\n" + s[m6.end():]

    s = add_chain_dep(s)
    report["chainDep"] = "buyPresenting,\n" in s

    # 5) import
    m7 = re.search(r'^import \{[^}]*\} from "\./[^"]+";\n', s, re.M)
    last_imp = None
    for mo in re.finditer(r'^import .*? from "[^"]+";\n', s, re.M | re.S):
        last_imp = mo
    report["import"] = last_imp is not None
    if last_imp:
        s = s[: last_imp.end()] + IMPORT + s[last_imp.end():]
    return s, report


bad = 0
for f in files:
    src = f.read_text(encoding="utf8")
    new, rep = transform(src)
    ok = rep.get("already") or (rep.get("state") and rep.get("deck") and rep.get("buyStart") and rep.get("buyDone") and rep.get("buyFail") and rep.get("import") and rep.get("sessionSites", 0) >= 1)
    print(("OK   " if ok else "SKIP ") + f.name, rep)
    if ok and APPLY and (not rep.get("already") or new != src.replace("\r\n", "\n")):
        f.write_text(new if "\r\n" not in src else new.replace("\n", "\r\n"), encoding="utf8", newline="")
    if not ok:
        bad += 1
print(f"{len(files) - bad}/{len(files)} files match every anchor" + (" (written)" if APPLY else " (dry run)"))
