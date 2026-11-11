import { BuyBonusModal } from "@/components/maxhigh/buy-bonus/BuyBonusModal";
import { buyBonusThemeFromRealms } from "@/components/maxhigh/buy-bonus/theme";
import { getBuyBonusSpec } from "@/lib/buy-bonus";
import type { RealmsGameDef } from "@/lib/realms/catalog";
import { BET_STEPS } from "./engine/paytable";

export type BuyFeatureModalProps = {
  /** The Realms title being played: supplies its name, world and palette. */
  def: RealmsGameDef;
  /** The game's currently selected bet: where the dialog starts (the player may pick another from the bet ladder). */
  bet: number;
  balance: number;
  /** Price per free spin (× bet) when buying `quantity` spins. */
  pricePerSpin: (quantity: number) => number;
  /** The title's live per-purchase cap (server-enforced as well). */
  maxQuantity: number;
  backdropSrc: string;
  scatterSrc: string;
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

/** Buy Bonus: the player picks bet and quantity at the title's own calibrated per-spin price. The server prices and validates the purchase. */
export function BuyFeatureModal({
  def,
  balance,
  bet,
  pricePerSpin,
  maxQuantity,
  backdropSrc,
  scatterSrc,
  onConfirm,
  onCancel,
}: BuyFeatureModalProps) {
  return (
    <BuyBonusModal
      theme={buyBonusThemeFromRealms(def, { backdrop: backdropSrc, symbolSrc: scatterSrc })}
      bet={bet}
      betOptions={BET_STEPS}
      quantity={getBuyBonusSpec(def.id, maxQuantity).quantity}
      pricePerUnitMult={pricePerSpin}
      balance={balance}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
