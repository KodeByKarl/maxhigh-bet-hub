/** Short, low-level, per-game recordings. No oscillator drones or noise loops. */
export function createGentleGameAudio(gameId: string, hasAmbient = true) {
  const id = gameId.replace(/^realms-/, "");
  let muted = false;
  let volume = 0.45;
  let unlocked = false;
  let spinTimer: ReturnType<typeof setInterval> | undefined;
  let ambient: HTMLAudioElement | undefined;
  const active = new Set<HTMLAudioElement>();
  const spinning = new Set<HTMLAudioElement>();
  const cache = new Map<string, HTMLAudioElement>();
  try {
    if (typeof localStorage !== "undefined") {
      const legacyMuteKey =
        gameId === "color-game"
          ? "colorgame:muted"
          : gameId === "color-game-pro"
            ? "colorgamepro:muted"
            : `${gameId}-muted`;
      muted =
        (localStorage.getItem(`${gameId}-muted`) ?? localStorage.getItem(legacyMuteKey)) === "1";
      const saved = localStorage.getItem(`${gameId}-volume`);
      if (saved !== null && Number.isFinite(Number(saved)))
        volume = Math.max(0, Math.min(0.7, Number(saved)));
    }
  } catch {
    /* storage unavailable */
  }
  const source = (event: string) => `/sounds/gentle-v1/${id}/${event}.wav`;
  function play(event: string, gain = 1) {
    if (muted || !unlocked || typeof Audio === "undefined") return;
    if (active.size >= 6) return;
    let template = cache.get(event);
    if (!template) {
      template = new Audio(source(event));
      template.preload = "auto";
      cache.set(event, template);
    }
    const audio = template.cloneNode(true) as HTMLAudioElement;
    audio.volume = volume * Math.max(0, Math.min(1, gain));
    active.add(audio);
    if (event === "startSpinLoop") spinning.add(audio);
    const release = () => {
      active.delete(audio);
      spinning.delete(audio);
    };
    audio.addEventListener("ended", release, { once: true });
    audio.addEventListener("error", release, { once: true });
    void audio.play().catch(release);
  }
  function stopSpinLoop() {
    if (spinTimer !== undefined) clearInterval(spinTimer);
    spinTimer = undefined;
    for (const audio of spinning) {
      audio.pause();
      active.delete(audio);
    }
    spinning.clear();
  }
  function stopAmbient() {
    ambient?.pause();
    ambient = undefined;
  }
  function stopSounds() {
    for (const a of active) a.pause();
    active.clear();
  }
  function startAmbient() {
    if (!hasAmbient || muted || !unlocked || ambient || typeof Audio === "undefined") return;
    ambient = new Audio(source("ambient"));
    ambient.loop = true;
    ambient.volume = volume * 0.28;
    void ambient.play().catch(() => {
      ambient = undefined;
    });
  }
  function unlock() {
    unlocked = true;
    startAmbient();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
  }
  return {
    get isMuted() {
      return muted;
    },
    get masterVolume() {
      return volume;
    },
    preload: unlock,
    play,
    setMuted(next: boolean) {
      muted = next;
      try {
        localStorage.setItem(`${gameId}-muted`, String(next ? 1 : 0));
      } catch {
        /* unavailable */
      }
      if (next) {
        stopSpinLoop();
        stopAmbient();
        stopSounds();
      } else startAmbient();
    },
    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },
    setVolume(next: number) {
      volume = Number.isFinite(next) ? Math.max(0, Math.min(0.7, next)) : 0.45;
      if (ambient) ambient.volume = volume * 0.28;
      for (const a of active) a.volume = Math.min(a.volume, volume);
      try {
        localStorage.setItem(`${gameId}-volume`, String(volume));
      } catch {
        /* unavailable */
      }
    },
    startAmbient,
    stopAmbient,
    startSpinLoop() {
      stopSpinLoop();
      if (muted) return;
      play("startSpinLoop", 0.45);
      let ticks = 0;
      spinTimer = setInterval(() => {
        if (++ticks > 20) stopSpinLoop();
        else play("startSpinLoop", 0.32);
      }, 600);
    },
    stopSpinLoop,
    playUiClick() {
      play("playUiClick", 0.5);
    },
    playReelStop(_index: number) {
      play("playReelStop", 0.55);
    },
    playCascadeTick() {
      play("playCascadeTick", 0.55);
    },
    playWin(amount: number, bet: number) {
      if (amount > 0 && bet > 0) play("playWin", amount / bet >= 5 ? 1 : 0.7);
    },
    playScatterTrigger() {
      stopSpinLoop();
      play("playScatterTrigger", 0.8);
    },
    playFreespinIntro() {
      stopSpinLoop();
      play("playFreespinIntro", 0.8);
    },
    endFreespins() {
      play("endFreespins", 0.6);
      startAmbient();
    },
  };
}

export type GentleWheelOptions = {
  totalDeg: number;
  startDeg: number;
  sliceDeg: number;
  durationSec: number;
};
export function scheduleGentleWheel(
  audio: ReturnType<typeof createGentleGameAudio>,
  opts: GentleWheelOptions,
  power: number,
) {
  const timers: ReturnType<typeof setTimeout>[] = [];
  if (opts.totalDeg <= 0 || opts.sliceDeg <= 0 || opts.durationSec <= 0) return () => undefined;
  let previous = -1;
  for (
    let b = Math.floor(opts.startDeg / opts.sliceDeg) + 1;
    b <= Math.floor((opts.startDeg + opts.totalDeg) / opts.sliceDeg);
    b++
  ) {
    const progress = (b * opts.sliceDeg - opts.startDeg) / opts.totalDeg;
    const at = (1 - Math.pow(1 - progress, 1 / power)) * opts.durationSec;
    if (at - previous < 0.12) continue;
    previous = at;
    timers.push(setTimeout(() => audio.play("tick", 0.35), at * 1000));
  }
  timers.push(setTimeout(() => audio.play("wheelSpin", 0.45), opts.durationSec * 1000));
  return () => timers.forEach(clearTimeout);
}
