import assert from "node:assert/strict";
import {
  DEFAULT_GAME_SOUND_SETTING,
  gameSoundGain,
  normalizeGameSoundSetting,
} from "../src/lib/game-sound-settings";

// Never configured: behaviour of every game is untouched.
assert.equal(DEFAULT_GAME_SOUND_SETTING.volumePercent, null);
assert.equal(gameSoundGain(DEFAULT_GAME_SOUND_SETTING), 1);
assert.deepEqual(normalizeGameSoundSetting(undefined), DEFAULT_GAME_SOUND_SETTING);
assert.deepEqual(normalizeGameSoundSetting("junk"), DEFAULT_GAME_SOUND_SETTING);
assert.deepEqual(normalizeGameSoundSetting({ volumePercent: "80" }), DEFAULT_GAME_SOUND_SETTING);

// 50% is the original built-in level, 0% silent, 100% = double (per-source output is capped at 1.0 by the audio layer).
assert.equal(gameSoundGain({ volumePercent: 50, muted: false }), 1);
assert.equal(gameSoundGain({ volumePercent: 0, muted: false }), 0);
assert.equal(gameSoundGain({ volumePercent: 100, muted: false }), 2);
assert.equal(gameSoundGain({ volumePercent: 25, muted: false }), 0.5);

// Mute always wins, even when no volume was ever saved.
assert.equal(gameSoundGain({ volumePercent: 80, muted: true }), 0);
assert.equal(gameSoundGain({ volumePercent: null, muted: true }), 0);

// Out-of-range and fractional values are clamped/rounded; only literal `true` mutes.
assert.equal(normalizeGameSoundSetting({ volumePercent: 250 }).volumePercent, 100);
assert.equal(normalizeGameSoundSetting({ volumePercent: -5 }).volumePercent, 0);
assert.equal(normalizeGameSoundSetting({ volumePercent: 33.6 }).volumePercent, 34);
assert.equal(normalizeGameSoundSetting({ volumePercent: Number.NaN }).volumePercent, null);
assert.equal(normalizeGameSoundSetting({ volumePercent: 10, muted: "yes" }).muted, false);
assert.equal(normalizeGameSoundSetting({ volumePercent: 10, muted: true }).muted, true);

console.log("game-sound: all assertions passed");
