/**
 * Midnight Owl — soft distinct perya voice (ear-safe roulette spin).
 */
import {
  createSoftPeryaAudio,
  PERYA_VOICES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const midnightOwlAudio = createSoftPeryaAudio(PERYA_VOICES["midnight-owl"]!);
