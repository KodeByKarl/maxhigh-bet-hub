import { BuyBonusModal } from "@/components/maxhigh/buy-bonus/BuyBonusModal";
import { buyBonusThemeFromPanther } from "@/components/maxhigh/buy-bonus/theme";
import { BUY_BONUS_FREE_SPINS } from "@/lib/buy-bonus";
import { prosperityLionAudio } from "./audio";
import { ICON_SRC, getBuyUnitPrice } from "./paytable";
import { prosperityLionTheme } from "./theme";

export const BUY_FS_QTY_MIN = 1;
export const BUY_FS_QTY_MAX = 50;

export type BuyFeatureModalProps = {
  /** The game's currently selected bet: the dialog never changes it. */
  bet: number;
  balance: number;
  mode: "normal" | "super";
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

/** Buy Bonus: always exactly 10 free spins at this game's own calibrated price. Presentation lives in the shared BuyBonusModal. */
export function BuyFeatureModal({ balance, bet, onConfirm, onCancel }: BuyFeatureModalProps) {
  const quantity = BUY_BONUS_FREE_SPINS; // fixed: a purchase always awards exactly 10 free spins
  const unitPrice = getBuyUnitPrice(bet, quantity);
  const totalPrice = +(unitPrice * quantity).toFixed(2);

  return (
    <BuyBonusModal
      theme={buyBonusThemeFromPanther("prosperity-lion", prosperityLionTheme, ICON_SRC.lollipop)}
      bet={bet}
      price={totalPrice}
      balance={balance}
      onCancel={onCancel}
      onConfirm={() => {
        prosperityLionAudio.playUiClick();
        onConfirm(bet, quantity);
      }}
    />
  );
}
