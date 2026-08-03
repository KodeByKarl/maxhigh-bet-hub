import type { SuperAceConfig } from "@/lib/super-ace-config";
import { DEFAULT_SUPER_ACE_CONFIG, applyRtpProfile } from "@/lib/super-ace-config";

let activeConfig: SuperAceConfig = applyRtpProfile({ ...DEFAULT_SUPER_ACE_CONFIG });

export function getSuperAceConfig(): SuperAceConfig {
  return activeConfig;
}

export function setSuperAceConfig(cfg: SuperAceConfig) {
  activeConfig = applyRtpProfile(cfg);
}
