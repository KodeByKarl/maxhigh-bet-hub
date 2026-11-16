import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Volume2, VolumeX } from "lucide-react";
import { getGameSoundSettingFn, superSaveGameSoundSettingFn } from "@/functions/game-sound";
import { GAME_SOUND_REFERENCE_PERCENT, type GameSoundSetting } from "@/lib/game-sound-settings";
import { saGlass } from "@/components/superadmin/ui/glass";

/** Super Admin card: general game sound volume (0–100%) with mute. Write access is enforced on the server. */
export function GameSoundSettingsCard() {
  const [saved, setSaved] = useState<GameSoundSetting | null>(null);
  const [percent, setPercent] = useState(GAME_SOUND_REFERENCE_PERCENT);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGameSoundSettingFn()
      .then((s) => {
        if (cancelled) return;
        setSaved(s);
        setPercent(s.volumePercent ?? GAME_SOUND_REFERENCE_PERCENT);
        setMuted(s.muted);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    !saved || saved.volumePercent === null
      ? true
      : saved.volumePercent !== percent || saved.muted !== muted;

  async function save() {
    setBusy(true);
    try {
      const next = await superSaveGameSoundSettingFn({ data: { volumePercent: percent, muted } });
      setSaved(next);
      toast.success(
        next.muted
          ? "Game sound muted for all players"
          : `Game sound set to ${next.volumePercent}%`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save game sound");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${saGlass} space-y-4 p-6`} data-testid="game-sound-card">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">General Game Sound</h2>
          <p className="text-xs text-muted-foreground">
            One volume for all game sound effects and music. {GAME_SOUND_REFERENCE_PERCENT}% equals
            the original built-in level
            {saved?.volumePercent === null ? " (currently unchanged — never saved)." : "."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          disabled={muted}
          onChange={(e) => setPercent(Number(e.target.value))}
          aria-label="General game sound volume"
          className="h-2 w-full cursor-pointer accent-amber-400 disabled:opacity-40"
        />
        <output className="w-14 text-right text-lg font-black tabular-nums text-foreground">
          {muted ? "Muted" : `${percent}%`}
        </output>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={muted}
            onChange={(e) => setMuted(e.target.checked)}
            className="h-4 w-4 accent-amber-400"
          />
          Mute all game sound
        </label>
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-black disabled:opacity-50"
        >
          <Save size={16} /> {busy ? "Saving…" : "Save sound"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Takes effect for players within a few minutes or on their next game open. Phones and
        browsers still require a tap before any sound can play.
      </p>
    </div>
  );
}
