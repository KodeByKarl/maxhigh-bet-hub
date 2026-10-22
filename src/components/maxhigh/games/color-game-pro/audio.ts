import {
  createGentleGameAudio,
  scheduleGentleWheel,
  type GentleWheelOptions,
} from "@/lib/gentle-game-audio";
export type ColorGameProSoundKey = "chip" | "deal" | "win" | "bigWin" | "lose" | "tick" | "click";
const audio = createGentleGameAudio("color-game-pro", false);
export const unlockColorGameProAudio = audio.preload;
export function isColorGameProMuted() {
  return audio.isMuted;
}
export function setColorGameProMuted(next: boolean) {
  audio.setMuted(next);
}
export function playColorGameProSound(key: ColorGameProSoundKey, volume = 1) {
  audio.play(key, volume);
}
export function wheelEasePro(p: number) {
  const q = 1 - Math.min(1, Math.max(0, p));
  return 1 - Math.pow(q, 5);
}
export function startWheelSpinPro(opts: GentleWheelOptions): () => void {
  return scheduleGentleWheel(audio, opts, 5);
}
