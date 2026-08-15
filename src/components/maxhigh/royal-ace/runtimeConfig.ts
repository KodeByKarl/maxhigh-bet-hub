import type { RoyalAceConfig } from "@/lib/royal-ace-config";
import { DEFAULT_ROYAL_ACE_CONFIG, applyRtpProfile } from "@/lib/royal-ace-config";

let activeConfig: RoyalAceConfig = applyRtpProfile({ ...DEFAULT_ROYAL_ACE_CONFIG });

export function getRoyalAceConfig(): RoyalAceConfig {
  return activeConfig;
}

export function setRoyalAceConfig(cfg: RoyalAceConfig) {
  activeConfig = applyRtpProfile(cfg);
}
