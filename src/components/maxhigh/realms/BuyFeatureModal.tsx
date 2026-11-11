import { BuyBonusModal } from "@/components/maxhigh/buy-bonus/BuyBonusModal";
import { buyBonusThemeFromRealms } from "@/components/maxhigh/buy-bonus/theme";
import { BUY_BONUS_FREE_SPINS } from "@/lib/buy-bonus";
import type { RealmsGameDef } from "@/lib/realms/catalog";

export type BuyFeatureModalProps = {
  /** The Realms title being played: supplies its name, world and palette. */
  def: RealmsGameDef;
  /** The game's currently selected bet: the dialog never changes it. */
  bet: number;
  balance: number;
  /** Price per free spin (× bet) when buying `quantity` spins. */
  pricePerSpin: (quantity: number) => number;
  backdropSrc: string;
  scatterSrc: string;
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

/** Buy Bonus: always exactly 10 free spins at the title's own calibrated price. Presentation lives in the shared BuyBonusModal. */
export function BuyFeatureModal({
  def,
  balance,
  bet,
  pricePerSpin,
  backdropSrc,
  scatterSrc,
  onConfirm,
  onCancel,
}: BuyFeatureModalProps) {
  const quantity = BUY_BONUS_FREE_SPINS; // fixed: a purchase always awards exactly 10 free spins
  const unitPrice = +(bet * pricePerSpin(quantity)).toFixed(2);
  const totalPrice = +(unitPrice * quantity).toFixed(2);

  return (
    <BuyBonusModal
      theme={buyBonusThemeFromRealms(def, { backdrop: backdropSrc, symbolSrc: scatterSrc })}
      bet={bet}
      price={totalPrice}
      balance={balance}
      onCancel={onCancel}
      onConfirm={() => onConfirm(bet, quantity)}
    />
  );
}
