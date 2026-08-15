/**
 * Ace High SFX + winner voice (Web Speech API).
 * Assets: public/sounds/ace-high/*.wav (from scripts/generate-ace-high-sounds.mjs)
 */
import { AH_ASSET } from "./animationConfig";

export type AceHighSoundKey =
  | "chip"
  | "deal"
  | "flip"
  | "win"
  | "tie"
  | "war"
  | "bigWin";

const FILES: Record<AceHighSoundKey, string> = {
  chip: "chip.wav",
  deal: "deal.wav",
  flip: "flip.wav",
  win: "win.wav",
  tie: "tie.wav",
  war: "war.wav",
  bigWin: "big-win.wav",
};

const DEFAULT_VOL: Partial<Record<AceHighSoundKey, number>> = {
  chip: 0.62,
  deal: 0.48,
  flip: 0.58,
  win: 0.7,
  bigWin: 0.78,
  tie: 0.55,
  war: 0.72,
};

let muted = false;
let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function getAudio(key: AceHighSoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${AH_ASSET.soundDir}/${FILES[key]}`;
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  return el;
}

/** Call once on first user gesture so autoplay policies allow SFX + speech. */
export function unlockAceHighAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    for (const key of Object.keys(FILES) as AceHighSoundKey[]) {
      const el = getAudio(key);
      if (!el) continue;
      el.volume = 0.001;
      void el.play().then(() => {
        el.pause();
        el.currentTime = 0;
      }).catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
}

export function setAceHighMuted(v: boolean) {
  muted = v;
  if (v && typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function playAceHighSound(key: AceHighSoundKey, volume?: number) {
  if (muted) return;
  unlockAceHighAudio();
  try {
    const el = getAudio(key);
    if (!el) return;
    const vol = volume ?? DEFAULT_VOL[key] ?? 0.55;
    el.volume = Math.max(0, Math.min(1, vol));
    el.currentTime = 0;
    void el.play().catch(() => {
      /* missing file / autoplay */
    });
  } catch {
    /* ignore */
  }
}

export type WinnerVoiceKind = "win" | "bigWin" | "dealer" | "tie" | "split" | "war";

const VOICE_LINES: Record<WinnerVoiceKind, string[]> = {
  win: ["You win!", "Winner!", "Nice hand!"],
  bigWin: ["Big win!", "Huge win!", "Jackpot energy!"],
  dealer: ["Dealer wins.", "House takes it."],
  tie: ["It's a tie!", "Going to war!"],
  split: ["Split pot.", "Push."],
  war: ["War!", "Go to war!"],
};

let voiceIndex = 0;

/** Spoken winner / outcome line (browser TTS). */
export function speakAceHighWinner(kind: WinnerVoiceKind) {
  if (muted || typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  // Skip TTS on phones — speechSynthesis is janky and blocks interaction
  const mobile =
    window.matchMedia?.("(pointer: coarse)").matches ||
    window.matchMedia?.("(max-width: 640px)").matches;
  if (mobile) return;
  unlockAceHighAudio();
  try {
    window.speechSynthesis.cancel();
    const lines = VOICE_LINES[kind];
    const text = lines[voiceIndex % lines.length]!;
    voiceIndex += 1;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = kind === "bigWin" ? 1.15 : kind === "war" ? 0.9 : 1.05;
    u.volume = kind === "bigWin" ? 1 : 0.92;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => /en(-|_|$)/i.test(v.lang));
    if (en) u.voice = en;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
