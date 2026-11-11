import { GoldRushModal } from "@/components/maxhigh/buy-bonus/GoldRushModal";
import { getBuyBonusSpec } from "@/lib/buy-bonus";
import { buffaloReignAudio } from "./audio";
import { BET_STEPS, ICON_SRC, getBuyMaxQuantity, getBuyUnitPrice } from "./paytable";
import { getBuffaloReignConfig } from "./runtimeConfig";

export const BUY_FS_QTY_MIN = 1;
export const BUY_FS_QTY_MAX = 50;

export type BuyFeatureModalProps = {
  /** The game's currently selected bet: where the dialog starts (the player may pick another from the game's bet ladder). */
  bet: number;
  balance: number;
  mode: "normal" | "super";
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

/** Buy Bonus: the player picks bet and quantity; the price per free spin is this game's own calibrated price. The server prices and validates the purchase. */
export function BuyFeatureModal({ balance, bet, onConfirm, onCancel }: BuyFeatureModalProps) {
  // The server refuses anything above the live session cap, so the selector uses the same limit (never a hardcoded range).
  const maxQuantity = getBuyMaxQuantity();
  const quantity = getBuyBonusSpec("buffalo-reign", maxQuantity).quantity;
  const cfg = getBuffaloReignConfig();
  const label = (kind: string, fallback: string) =>
    cfg.symbols.find((x) => x.kind === kind)?.label ?? fallback;
  const bombMults = cfg.bombTable.filter((b) => b.weight > 0).map((b) => b.mult);

  return (
    <GoldRushModal
      gameId="buffalo-reign"
      gameName="Buffalo Reign"
      symbolSrc={ICON_SRC.lollipop}
      emblemSrc={ICON_SRC.heart}
      bet={bet}
      betOptions={BET_STEPS}
      quantity={quantity}
      pricePerUnitMult={(q) => getBuyUnitPrice(1, q)}
      balance={balance}
      feature={{
        scatterName: label("lollipop", "Scatter"),
        bombName: label("bomb", "Wild"),
        triggerCount: cfg.freeSpinsTriggerCount,
        naturalAward: cfg.freeSpinsBase,
        retriggerCount: cfg.freeSpinsRetriggerCount,
        retriggerSpins: cfg.freeSpinsRetrigger,
        maxSessionSpins: cfg.maxFsSessionSpins,
        bombMin: bombMults.length ? Math.min(...bombMults) : 0,
        bombMax: bombMults.length ? Math.max(...bombMults) : 0,
        maxBombMult: cfg.maxFsBombMult,
        maxWinMult: cfg.maxWinMult,
        unavailable:
          maxQuantity < 1 || !(cfg.buyFeatureMult > 0) ? "price not configured" : undefined,
      }}
      onCancel={onCancel}
      onConfirm={(buyBet, buyQty) => {
        buffaloReignAudio.playUiClick();
        onConfirm(buyBet, buyQty);
      }}
    />
  );
}
