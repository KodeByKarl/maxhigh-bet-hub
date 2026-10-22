/**
 * Fortune Rabbit — soft distinct perya voice (ear-safe).
 */
import {
  createSoftPeryaAudio,
  PERYA_VOICES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const fortuneRabbitAudio = createSoftPeryaAudio(PERYA_VOICES["fortune-rabbit"]!);
