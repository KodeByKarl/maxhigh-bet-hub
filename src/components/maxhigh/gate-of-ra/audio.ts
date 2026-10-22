/**
 * Gate of Ra — soft distinct perya voice (ear-safe).
 */
import {
  createSoftPeryaAudio,
  PERYA_VOICES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const gateOfRaAudio = createSoftPeryaAudio(PERYA_VOICES["gate-of-ra"]!);
