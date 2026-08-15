import type { QuezonQuestConfig } from "@/lib/quezon-quest-config";
import { DEFAULT_QUEZON_QUEST_CONFIG } from "@/lib/quezon-quest-config";

let activeConfig: QuezonQuestConfig = { ...DEFAULT_QUEZON_QUEST_CONFIG };

export function getQuezonQuestConfig(): QuezonQuestConfig {
  return activeConfig;
}

export function setQuezonQuestConfig(cfg: QuezonQuestConfig) {
  activeConfig = cfg;
}
