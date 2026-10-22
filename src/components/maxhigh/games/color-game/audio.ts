import {
  createGentleGameAudio,
  scheduleGentleWheel,
  type GentleWheelOptions,
} from "@/lib/gentle-game-audio";
export type ColorGameSoundKey = "chip" | "deal" | "win" | "bigWin" | "lose" | "tick" | "land";
const audio = createGentleGameAudio("color-game", false);
export const unlockColorGameAudio = audio.preload;
export function isColorGameMuted() {
  return audio.isMuted;
}
export function setColorGameMuted(next: boolean) {
  audio.setMuted(next);
}
export function playColorGameSound(key: ColorGameSoundKey, volume = 1) {
  audio.play(key, volume);
}
export function wheelEase(p: number) {
  const q = 1 - Math.min(1, Math.max(0, p));
  return 1 - Math.pow(q, 4);
}
export function startWheelSpin(opts: GentleWheelOptions): () => void {
  return scheduleGentleWheel(audio, opts, 4);
}
