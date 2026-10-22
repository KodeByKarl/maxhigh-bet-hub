import assert from "node:assert/strict";
import { createGentleGameAudio, scheduleGentleWheel } from "../src/lib/gentle-game-audio";

const priorAudio = globalThis.Audio;
class FakeAudio {
  static played: FakeAudio[] = [];
  volume = 1;
  paused = false;
  preload = "";
  loop = false;
  constructor(public src: string) {}
  cloneNode() {
    return new FakeAudio(this.src);
  }
  addEventListener() {}
  play() {
    FakeAudio.played.push(this);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
globalThis.Audio = FakeAudio as unknown as typeof Audio;
try {
  const audio = createGentleGameAudio("solar-serpent", false);
  audio.play("playWin");
  assert.equal(FakeAudio.played.length, 0, "Playback must wait for unlock");
  audio.preload();
  for (let i = 0; i < 20; i++) audio.play("playWin");
  assert.equal(FakeAudio.played.length, 6, "Overlapping sounds must be bounded");
  assert.ok(FakeAudio.played.every((a) => a.src === "/sounds/gentle-v1/solar-serpent/playWin.wav"));
  audio.setMuted(true);
  assert.ok(
    FakeAudio.played.every((a) => a.paused),
    "Mute must stop existing sounds",
  );
  audio.play("playWin");
  assert.equal(FakeAudio.played.length, 6);
  audio.setMuted(false);
  audio.startSpinLoop();
  audio.stopSpinLoop();
  assert.ok(FakeAudio.played.at(-1)?.paused, "Spin stop must cancel the playing spin clip");
  audio.setVolume(NaN);
  assert.equal(audio.masterVolume, 0.45);
  audio.setVolume(10);
  assert.equal(audio.masterVolume, 0.7);
  const cancel = scheduleGentleWheel(
    audio,
    { startDeg: 0, totalDeg: 720, sliceDeg: 60, durationSec: 1 },
    4,
  );
  cancel();
  audio.setMuted(true);
  console.log(
    "PASS: per-game paths, unlock, overlap limit, mute, spin cancellation and volume bounds.",
  );
} finally {
  if (priorAudio) globalThis.Audio = priorAudio;
  else Reflect.deleteProperty(globalThis, "Audio");
}
