import { BuyBonusModal } from "@/components/maxhigh/buy-bonus/BuyBonusModal";
import { FrozenVaultModal } from "@/components/maxhigh/buy-bonus/FrozenVaultModal";
import { buyBonusThemeFromRealms } from "@/components/maxhigh/buy-bonus/theme";
import { getBuyBonusSpec } from "@/lib/buy-bonus";
import type { RealmsGameDef } from "@/lib/realms/catalog";
import type { RealmsConfig } from "@/lib/realms/schema";
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
  /** The title's live math config: Aurora's Frozen Vault shows its retrigger, cap and trigger rules from here (never hardcoded). */
  cfg?: RealmsConfig;
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

/** Titles with their own Buy Bonus presentation. Same contract (quantity rules, price formula, onConfirm), different look. */
const VAULT_GAMES = new Set(["aurora-spire"]);

/** Buy Bonus: the player picks bet and quantity at the title's own calibrated per-spin price. The server prices and validates the purchase. */
export function BuyFeatureModal({
  def,
  balance,
  bet,
  pricePerSpin,
  maxQuantity,
  backdropSrc,
  scatterSrc,
  cfg,
  onConfirm,
  onCancel,
}: BuyFeatureModalProps) {
  const spec = getBuyBonusSpec(def.id, maxQuantity).quantity;
  if (VAULT_GAMES.has(def.id) && cfg) {
    return (
      <FrozenVaultModal
        theme={buyBonusThemeFromRealms(def, { backdrop: backdropSrc, symbolSrc: scatterSrc })}
        bet={bet}
        betOptions={BET_STEPS}
        quantity={spec}
        pricePerUnitMult={pricePerSpin}
        balance={balance}
        feature={{
          scatterName: def.scatter.name,
          bombName: def.bomb.name,
          naturalAward: cfg.freeSpinsBase,
          triggerCount: cfg.freeSpinsTriggerCount,
          retriggerCount: cfg.freeSpinsRetriggerCount,
          retriggerSpins: cfg.freeSpinsRetrigger,
          maxSessionSpins: cfg.maxFsSessionSpins,
          maxWinMult: cfg.maxWinMult,
          unavailable:
            maxQuantity < 1 || !(cfg.buyFeatureMult > 0) ? "price not configured" : undefined,
        }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }
  return (
    <BuyBonusModal
      theme={buyBonusThemeFromRealms(def, { backdrop: backdropSrc, symbolSrc: scatterSrc })}
      bet={bet}
      betOptions={BET_STEPS}
      quantity={spec}
      pricePerUnitMult={pricePerSpin}
      balance={balance}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
