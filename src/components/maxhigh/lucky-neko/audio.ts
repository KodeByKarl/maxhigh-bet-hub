/**
 * Lucky Neko — soft lucky-bell perya voice (ear-safe).
 */
import {
  createSoftPeryaAudio,
  PERYA_VOICES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const luckyNekoAudio = createSoftPeryaAudio(PERYA_VOICES["lucky-neko"]!);
