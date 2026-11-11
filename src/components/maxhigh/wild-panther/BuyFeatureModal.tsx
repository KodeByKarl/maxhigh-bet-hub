import { BuyBonusModal } from "@/components/maxhigh/buy-bonus/BuyBonusModal";
import { buyBonusThemeFromPanther } from "@/components/maxhigh/buy-bonus/theme";
import { getBuyBonusSpec } from "@/lib/buy-bonus";
import { ICON_SRC } from "./paytable";

export type BuyFeatureModalProps = {
  bet: number;
  cost: number;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Wild Panther's look: jungle emerald with gold, over the game's own backdrop and scatter art. */
const WILD_PANTHER_BUY_THEME = {
  name: "Wild Panther",
  assets: { backdrop: "/images/symbols/wild-panther/backdrop-v20261012-unique.webp" },
  colors: { accent: "#F5C542", accentSoft: "#FDE68A", accentDeep: "#064E3B" },
};

/** Buy Bonus: always exactly 10 free spins at the price the game passes in (`cost`). Presentation lives in the shared BuyBonusModal. */
export function BuyFeatureModal({ bet, cost, balance, onConfirm, onCancel }: BuyFeatureModalProps) {
  return (
    <BuyBonusModal
      theme={buyBonusThemeFromPanther("wild-panther", WILD_PANTHER_BUY_THEME, ICON_SRC.lollipop)}
      bet={bet}
      quantity={getBuyBonusSpec("wild-panther").quantity}
      pricePerUnitMult={() => cost / bet / 10}
      balance={balance}
      onCancel={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
