/**
 * Golden Panther — soft distinct perya voice (ear-safe roulette spin).
 */
import {
  createSoftPeryaAudio,
  PERYA_VOICES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const pantherAudio = createSoftPeryaAudio(PERYA_VOICES["golden-panther"]!);
