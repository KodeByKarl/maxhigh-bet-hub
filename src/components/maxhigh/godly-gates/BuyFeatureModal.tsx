import { BuyBonusModal } from "@/components/maxhigh/buy-bonus/BuyBonusModal";
import { buyBonusThemeFromPanther } from "@/components/maxhigh/buy-bonus/theme";
import { getBuyBonusSpec } from "@/lib/buy-bonus";
import { godlyGatesAudio } from "./audio";
import { BET_STEPS, ICON_SRC, getBuyUnitPrice } from "./paytable";
import { godlyGatesTheme } from "./theme";

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
  const quantity = getBuyBonusSpec("godly-gates").quantity;

  return (
    <BuyBonusModal
      theme={buyBonusThemeFromPanther("godly-gates", godlyGatesTheme, ICON_SRC.lollipop)}
      bet={bet}
      betOptions={BET_STEPS}
      quantity={quantity}
      pricePerUnitMult={(q) => getBuyUnitPrice(1, q)}
      balance={balance}
      onCancel={onCancel}
      onConfirm={(buyBet, buyQty) => {
        godlyGatesAudio.playUiClick();
        onConfirm(buyBet, buyQty);
      }}
    />
  );
}
