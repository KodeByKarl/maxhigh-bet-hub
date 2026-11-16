/**
 * General game sound setting (shared by client and server, no side effects).
 *
 * `volumePercent === null` means "never configured": every game keeps its existing built-in volume (backwards compatible).
 * Once a Super Admin saves a value, 50% corresponds to the built-in game levels (≈0.42–0.55 per source), 0% is silent and
 * 100% is the loudest the platform allows (per-source output is still capped at 1.0 by the audio layer).
 */
export type GameSoundSetting = {
  /** 0–100, or null when the Super Admin has never saved a value. */
  volumePercent: number | null;
  muted: boolean;
};

export const DEFAULT_GAME_SOUND_SETTING: GameSoundSetting = { volumePercent: null, muted: false };

/** Slider position at which sounds play at their built-in level. */
export const GAME_SOUND_REFERENCE_PERCENT = 50;

export function normalizeGameSoundSetting(input: unknown): GameSoundSetting {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const raw = o.volumePercent;
  const volumePercent =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.max(0, Math.min(100, Math.round(raw)))
      : null;
  return { volumePercent, muted: o.muted === true };
}

/** Multiplier applied on top of every game's own volume. 1 = untouched. */
export function gameSoundGain(setting: GameSoundSetting): number {
  if (setting.muted) return 0;
  if (setting.volumePercent === null) return 1;
  return setting.volumePercent / GAME_SOUND_REFERENCE_PERCENT;
}
