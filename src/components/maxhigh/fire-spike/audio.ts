/** Fire Spike audio — crackling steelpan voice (soft perya engine). */
import {
  createSoftPeryaAudio,
  PERYA_SCALES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const fireSpikeAudio = createSoftPeryaAudio({
  id: "fire-spike",
  root: 330,
  scale: PERYA_SCALES.phrygianDom,
  instrument: "steelpan",
  spin: "crackle",
  tempo: 1.15,
  brightness: 4800,
});
