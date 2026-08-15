import type {
  CrateDropId,
  FishTierId,
  PowerUpId,
  WeaponTierId,
} from "@/lib/whale-war-config";
import type { CrateDropResult, ShotResolveResult } from "./hitResolver";
import type { SwimPathKind } from "./animationConfig";

export type ArenaFish = {
  instanceId: string;
  tierId: FishTierId;
  hitsTaken: number;
  hitsRequired: number;
  payoutMult: number;
  y: number;
  fromLeft: boolean;
  path: SwimPathKind;
  speedMs: number;
  size: number;
  frozenUntil: number;
  createdAt: number;
  dying?: boolean;
};

export type PublicShotResult = {
  balance: number;
  shot: ShotResolveResult;
  targetInstanceId: string;
  weaponId: WeaponTierId;
  /** Server-authoritative fish state after shot (partial). */
  fishUpdate: {
    instanceId: string;
    hitsTaken: number;
    hitsRequired?: number;
    payoutMult?: number;
    killed: boolean;
  };
  /** Inventory / buff updates. */
  goldenHookMult: number;
  powerUps: Partial<Record<PowerUpId, number>>;
  boss?: {
    active: boolean;
    hitsTaken: number;
    hitsRequired: number;
    expiresAt: number;
  } | null;
  killBanner?: {
    label: string;
    credit: number;
    tierId: FishTierId;
  } | null;
  crateDrop?: CrateDropResult | null;
};

export type WhaleWarSessionPublic = {
  sessionId: string;
  weaponId: WeaponTierId;
  goldenHookMult: number;
  powerUps: Partial<Record<PowerUpId, number>>;
  balance: number;
  boss: {
    active: boolean;
    instanceId: string;
    hitsTaken: number;
    hitsRequired: number;
    payoutMult: number;
    expiresAt: number;
  } | null;
};

export type { CrateDropId, FishTierId, PowerUpId, WeaponTierId };
