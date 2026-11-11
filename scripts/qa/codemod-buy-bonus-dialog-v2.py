"""Final Buy Bonus purchase interface for every game with a Buy Bonus. DRY-RUN by default; --apply writes.
The dialog now shows ONLY: CURRENT BET (the game's selected bet), BUY BONUS PRICE (automatic), FREE SPINS 10, [Confirm Buy Bonus] [Cancel].
It no longer has its own bet or quantity controls. The deck's Buy Bonus price follows the game's current bet. The Free Spins announcement
closes by itself so the first bonus spin starts automatically (a tap still skips ahead).
Touches: 29 template dialogs + their slots, the shared Realms dialog + RealmsSlot, the Wild Panther dialog + slot. No pricing/server code.
  python scripts/qa/codemod-buy-bonus-dialog-v2.py [--apply]
"""
import re
import sys
from pathlib import Path

M = Path(__file__).resolve().parents[2] / "src" / "components" / "maxhigh"
APPLY = "--apply" in sys.argv
CANCEL_BTN = (
    '          <button\n            type="button"\n            onClick={onCancel}\n'
    '            className="mt-2 w-full rounded-xl border border-white/25 bg-black/35 py-2.5 text-sm font-black uppercase tracking-wider text-white/85"\n'
    "          >\n            Cancel\n          </button>\n"
)
NEW_ROWS = (
    '            <Row label="Current Bet">\n              <ValueBox>₱ {formatPrice(bet)}</ValueBox>\n            </Row>\n\n'
    '            <Row label="Buy Bonus Price">\n              <ValueBox emphasize>₱ {formatPrice(totalPrice)}</ValueBox>\n            </Row>\n\n'
    '            <Row label="Free Spins" last>\n              <ValueBox>{quantity}</ValueBox>\n            </Row>\n'
)


def rd(p):
    return p.read_text(encoding="utf8").replace("\r\n", "\n")


def dialog_template(s, realms=False):
    if "Confirm Buy Bonus" in s:
        return s, "already"
    n = 0

    def sub(pat, rep, flags=0, count=0):
        nonlocal s, n
        s, k = re.subn(pat, rep, s, count=count, flags=flags)
        n += 1 if k else 0
        return k

    sub(r"(export type BuyFeatureModalProps = \{\n)", r"\1  /** The game's currently selected bet: the dialog never changes it. */\n  bet: number;\n", count=1)
    sub(r"\{\s*balance,\s*mode,\s*onConfirm,\s*onCancel\s*\}" if not realms else r"\{\n  balance,\n  pricePerSpin,", "{ balance, bet, mode, onConfirm, onCancel }" if not realms else "{\n  balance,\n  bet,\n  pricePerSpin,", count=1)
    sub(r"  const \[buyBet, setBuyBet\] = useState\(BUY_FS_START_BET\);\n", "")
    sub(r"  const canBetMinus = buyBet > BUY_FS_BET_MIN;\n", "")
    sub(r"  const canBetPlus = buyBet < BUY_FS_BET_MAX;\n", "")
    sub(r"\n  const nudgeBet = \(dir: -1 \| 1\) => \{\n    setBuyBet\([^\n]*\n  \};\n", "\n")
    s = s.replace("getBuyUnitPrice(buyBet, quantity)", "getBuyUnitPrice(bet, quantity)").replace("buyBet * pricePerSpin(quantity)", "bet * pricePerSpin(quantity)").replace("onConfirm(buyBet, quantity)", "onConfirm(bet, quantity)")
    sub(r'            <Row label="Bet\(₱\)">.*?<Row label="Total Price" last>\n.*?</Row>\n', NEW_ROWS, flags=re.S, count=1)
    sub(r"Buy &amp; Play", "Confirm Buy Bonus")
    sub(r"(            Confirm Buy Bonus\n          </button>\n)", lambda m: m.group(1) + CANCEL_BTN, count=1) if False else None
    s, k = re.subn(r"(            Confirm Buy Bonus\n          </button>\n)", lambda m: m.group(1) + CANCEL_BTN, s, count=1)
    n += 1 if k else 0
    sub(r"\nfunction Stepper\(.*?(?=\nfunction ValueBox)", "\n", flags=re.S, count=1)
    sub(r'import \{ useState, type ReactNode \} from "react";', 'import type { ReactNode } from "react";', count=1)
    if realms:
        sub(r'import \{ BUY_FS_BET_MAX, BUY_FS_BET_MIN, BUY_FS_START_BET \} from "\./engine/paytable";\n', "", count=1)
    else:
        sub(r"  BUY_FS_BET_MAX,\n  BUY_FS_BET_MIN,\n  BUY_FS_START_BET,\n", "", count=1)
    left = [t for t in ("buyBet", "setBuyBet", "nudgeBet", "Stepper", "StepBtn", "BUY_FS_BET_M", "BUY_FS_START_BET") if t in s]
    expected = 13 if not realms else 13
    return s, ("ok" if not left and n >= 12 else f"leftover {left} anchors {n}")


def dialog_wp(s):
    if "Confirm Buy Bonus" in s:
        return s, "already"
    n = 0
    for a, b in [
        ('import { BET_STEPS } from "./paytable";\n', ""),
        ("  onBetChange: (bet: number) => void;\n", ""),
        ("  onBetChange,\n", ""),
        ("Confirm Rebuy\n", "Buy Bonus\n"),
        ("              Yes\n", "              Confirm Buy Bonus\n"),
    ]:
        if a in s:
            s = s.replace(a, b, 1); n += 1
    s, k = re.subn(r"  const found = BET_STEPS\.findIndex.*?const canAfford = balance >= cost;\n\n  const nudge = \(dir: -1 \| 1\) => \{\n    const next = BET_STEPS\[stepIdx \+ dir\];\n    if \(next != null\) onBetChange\(next\);\n  \};\n", "  const canAfford = balance >= cost;\n", s, count=1, flags=re.S); n += k
    # static current bet instead of the stepper
    s, k = re.subn(r'          \{/\* Base bet \*/\}\n          <div className="relative mt-5 text-center">.*?\n            \{!canAfford && \(', '''          {/* Current bet (the game's selected bet; change it in the game before buying) */}
          <div className="relative mt-5 text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
              Current Bet
            </div>
            <div
              className="mx-auto mt-2 min-w-[120px] max-w-[200px] rounded-xl border-2 border-amber-300/60 px-4 py-2.5 text-center font-black tabular-nums text-yellow-300"
              style={{
                background: "linear-gradient(180deg, #065F46, #022014)",
                fontSize: "1.25rem",
                textShadow: "0 2px 0 #78350f",
              }}
            >
              ₱{bet.toFixed(2)}
            </div>
            {!canAfford && (''', s, count=1, flags=re.S); n += k
    return s, ("ok" if n >= 7 and "BET_STEPS" not in s and "nudge" not in s else f"anchors {n}")


def slot_template(s, realms=False):
    n = 0
    a = re.search(r"(<BuyFeatureModal\n(\s*)balance=\{balance\}\n)", s)
    if a and "bet={bet}" not in s[a.start(): a.end() + 80]:
        s = s[: a.end()] + f"{a.group(2)}bet={{bet}}\n" + s[a.end():]; n += 1
    if realms:
        s, k = re.subn(r"BUY_FS_START_BET \*\s*buyPricePerSpin\(BUY_BONUS_FREE_SPINS\)", "bet * buyPricePerSpin(BUY_BONUS_FREE_SPINS)", s)
    else:
        s, k = re.subn(r"getBuyUnitPrice\(BUY_FS_START_BET, BUY_BONUS_FREE_SPINS\)", "getBuyUnitPrice(bet, BUY_BONUS_FREE_SPINS)", s)
    n += 1 if k else 0
    if len(re.findall(r"\bBUY_FS_START_BET\b", s)) == 1:  # only the import is left
        s = re.sub(r"\n  BUY_FS_START_BET,", "", s, count=1)
        s = re.sub(r"\bBUY_FS_START_BET, ", "", s, count=1)
        s = re.sub(r", BUY_FS_START_BET\b", "", s, count=1)
    # automatic close of the announcement (first bonus spin starts by itself; a tap still skips ahead)
    m = re.search(r"      setTriggerModalCount\(fsCount\);\n      await waitForTriggerModal\(\);\n    \},\n    \[([^\]]*)\],\n", s)
    if m and "autoClose" not in s:
        deps = m.group(1)
        if "dismissTriggerModal" not in deps:
            deps = deps.replace("waitForTriggerModal", "dismissTriggerModal, waitForTriggerModal") if "waitForTriggerModal" in deps else deps + ", dismissTriggerModal"
        new = ("      setTriggerModalCount(fsCount);\n"
               "      // the announcement closes by itself so the first free spin starts automatically (a tap still skips ahead)\n"
               "      const autoClose = window.setTimeout(dismissTriggerModal, turboRef.current ? 900 : 2400);\n"
               "      await waitForTriggerModal();\n      window.clearTimeout(autoClose);\n    },\n    [" + deps + "],\n")
        s = s[: m.start()] + new + s[m.end():]; n += 1
    ok = "bet={bet}" in s and "autoClose" in s and "BUY_FS_START_BET *" not in s
    return s, ("ok" if ok else f"anchors {n}")


def slot_wp(s):
    n = 0
    if "            onBetChange={setBet}\n" in s:
        s = s.replace("            onBetChange={setBet}\n", "", 1); n += 1
    a = "      setTriggerModalCount(awardedSpins);\n      setBuyPresenting(false);\n"
    if a in s and "autoCloseAnnouncement" not in s:
        s = s.replace(a, a + "      // the announcement closes by itself so the first free spin starts automatically (a tap still skips ahead)\n      const autoCloseAnnouncement = schedule(() => setTriggerModalCount(null), turboRef.current ? 900 : 2400);\n      void autoCloseAnnouncement;\n", 1); n += 1
    return s, ("ok" if n == 2 else f"anchors {n}")


jobs = []
for p in sorted(M.glob("*/BuyFeatureModal.tsx")):
    jobs.append(("dialog-wp" if p.parent.name == "wild-panther" else "dialog-realms" if p.parent.name == "realms" else "dialog", p))
for p in sorted(M.glob("*Slot.tsx")):
    t = rd(p)
    if "playBuyScatterIntro" in t:
        jobs.append(("slot-realms" if p.name == "RealmsSlot.tsx" else "slot", p))
jobs.append(("slot-wp", M / "WildPantherSlot.tsx"))

ok = bad = 0
for kind, p in jobs:
    src = rd(p)
    if kind == "dialog": new, st = dialog_template(src)
    elif kind == "dialog-realms": new, st = dialog_template(src, realms=True)
    elif kind == "dialog-wp": new, st = dialog_wp(src)
    elif kind == "slot": new, st = slot_template(src)
    elif kind == "slot-realms": new, st = slot_template(src, realms=True)
    else: new, st = slot_wp(src)
    good = st in ("ok", "already")
    if not good: print("SKIP", kind, p.name, "<-", st)
    ok += good; bad += not good
    if good and APPLY and st == "ok":
        p.write_text(new, encoding="utf8", newline="")
print(f"{ok} ok, {bad} not matched" + (" (written)" if APPLY else " (dry run)"))
