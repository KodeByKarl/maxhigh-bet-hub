import { useEffect } from "react";
import { getGameSoundSettingFn } from "@/functions/game-sound";
import { installGameSoundControl, setGameSoundSetting } from "@/lib/game-sound-control";

const REFRESH_MS = 5 * 60 * 1000;

/** Mounted once at the app root: installs the audio hooks and keeps the Super Admin sound setting fresh. */
export function GameSoundBootstrap() {
  useEffect(() => {
    installGameSoundControl();
    let cancelled = false;
    const load = () => {
      getGameSoundSettingFn()
        .then((s) => {
          if (!cancelled) setGameSoundSetting(s);
        })
        .catch(() => {
          /* keep the last known / built-in volume */
        });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
