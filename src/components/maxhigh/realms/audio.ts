/**
 * Realms audio — each title gets its own soft perya voice (instrument, scale,
 * spin texture, root) from the catalog, created lazily on first play.
 */
import {
  createSoftPeryaAudio,
  PERYA_SCALES,
  type SoftPeryaAudio,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";
import { FAMILY_KEY, type RealmsGameDef } from "@/lib/realms";

const voices = new Map<string, SoftPeryaAudio>();

export function realmsAudio(def: RealmsGameDef): SoftPeryaAudio {
  let audio = voices.get(def.id);
  if (!audio) {
    audio = createSoftPeryaAudio({
      id: `${FAMILY_KEY}-${def.id}`,
      root: def.voice.root,
      scale: PERYA_SCALES[def.voice.scale],
      instrument: def.voice.instrument,
      spin: def.voice.spin,
      tempo: def.voice.tempo,
      brightness: 4800,
    });
    voices.set(def.id, audio);
  }
  return audio;
}
