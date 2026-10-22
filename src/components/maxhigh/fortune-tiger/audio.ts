/**
 * Fortune Tiger — soft distinct perya voice (ear-safe).
 */
import {
  createSoftPeryaAudio,
  PERYA_VOICES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const fortuneTigerAudio = createSoftPeryaAudio(PERYA_VOICES["fortune-tiger"]!);
