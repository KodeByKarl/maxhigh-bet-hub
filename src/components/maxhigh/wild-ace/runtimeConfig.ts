import type { WildAceConfig } from "@/lib/wild-ace-config";
import { DEFAULT_WILD_ACE_CONFIG, applyRtpProfile } from "@/lib/wild-ace-config";

let activeConfig: WildAceConfig = applyRtpProfile({ ...DEFAULT_WILD_ACE_CONFIG });

export function getWildAceConfig(): WildAceConfig {
  return activeConfig;
}

export function setWildAceConfig(cfg: WildAceConfig) {
  activeConfig = applyRtpProfile(cfg);
}
