import type { MegaAceConfig } from "@/lib/mega-ace-config";
import { DEFAULT_MEGA_ACE_CONFIG, applyRtpProfile } from "@/lib/mega-ace-config";

let activeConfig: MegaAceConfig = applyRtpProfile({ ...DEFAULT_MEGA_ACE_CONFIG });

export function getMegaAceConfig(): MegaAceConfig {
  return activeConfig;
}

export function setMegaAceConfig(cfg: MegaAceConfig) {
  activeConfig = applyRtpProfile(cfg);
}
