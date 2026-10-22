/** Coin Volcano audio — rolling coin-clink voice (soft perya engine). */
import {
  createSoftPeryaAudio,
  PERYA_SCALES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const coinVolcanoAudio = createSoftPeryaAudio({
  id: "coin-volcano",
  root: 262,
  scale: PERYA_SCALES.mixolydian,
  instrument: "vibes",
  spin: "coins",
  tempo: 1.05,
  brightness: 5000,
});
