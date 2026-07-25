import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listSuperGamesFn, superUpdateGameFn } from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { CANDY_PEAK_GAME_ID } from "@/lib/candy-peak-config";
import { GODLY_GATES_GAME_ID } from "@/lib/godly-gates-config";
import { SUGAR_SURGE_GAME_ID } from "@/lib/sugar-surge-config";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CandyPeakConfigModal } from "@/components/superadmin/games/CandyPeakConfigModal";
import { GodlyGatesConfigModal } from "@/components/superadmin/games/GodlyGatesConfigModal";
import { SugarSurgeConfigModal } from "@/components/superadmin/games/SugarSurgeConfigModal";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/games")({
  component: SuperGamesPage,
});

function SuperGamesPage() {
  const { user, isReady } = useAuth();
  const [games, setGames] = useState<SuperGameRow[]>([]);
  const [selected, setSelected] = useState<SuperGameRow | null>(null);

  const load = useCallback(async () => {
    const rows = await listSuperGamesFn();
    setGames(rows);
    setSelected((prev) => (prev ? (rows.find((g) => g.gameId === prev.gameId) ?? null) : null));
  }, []);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load().catch(() => setGames([]));
  }, [isReady, user, load]);

  async function patch(
    gameId: string,
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) {
    try {
      await superUpdateGameFn({
        data: {
          gameId,
          enabled: data.enabled,
          featured: data.featured,
          tag: data.tag,
          rtp: data.rtp,
          volatility: data.volatility,
          minBet: data.minBet,
          maxBet: data.maxBet,
          notes: data.notes,
        },
      });
      toast.success("Game updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const isCandy = selected?.gameId === CANDY_PEAK_GAME_ID;
  const isGodly = selected?.gameId === GODLY_GATES_GAME_ID;
  const isSugar = selected?.gameId === SUGAR_SURGE_GAME_ID;

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Games control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click Candy Peak, Sugar Surge, or Godly Gates for full config. Other titles use lobby settings only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {games.map((g) => (
          <button
            key={g.gameId}
            type="button"
            onClick={() => setSelected(g)}
            className={`${saGlass} group overflow-hidden text-left transition hover:ring-2 hover:ring-amber-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
          >
            <div className="relative aspect-[16/10]">
              <img
                src={g.thumb}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-base font-black uppercase leading-tight text-foreground">{g.name}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {g.category}
                  {g.gameId === CANDY_PEAK_GAME_ID ||
                  g.gameId === GODLY_GATES_GAME_ID ||
                  g.gameId === SUGAR_SURGE_GAME_ID
                    ? " · full config"
                    : ""}
                </div>
              </div>
              {!g.enabled && (
                <div className="absolute right-3 top-3 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase text-foreground">
                  Disabled
                </div>
              )}
              {g.enabled && g.featured && (
                <div className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                  Featured
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && isCandy ? (
        <CandyPeakConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSugar ? (
        <SugarSurgeConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isGodly ? (
        <GodlyGatesConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : (
        <GameControlModal
          game={selected}
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatch={patch}
        />
      )}
    </div>
  );
}

function GameControlModal({
  game,
  open,
  onOpenChange,
  onPatch,
}: {
  game: SuperGameRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (
    gameId: string,
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
}) {
  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(100%-1.5rem,28rem)] overflow-y-auto border-amber-500/20 bg-panel p-0 text-foreground sm:rounded-2xl">
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl">
          <img src={game.thumb} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A120E] via-[#1A120E]/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl font-black uppercase tracking-wide text-foreground">
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {game.category} · {game.gameId}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onPatch(game.gameId, { enabled: !game.enabled })}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                game.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {game.enabled ? "Enabled" : "Disabled"}
            </button>
            <button
              type="button"
              onClick={() => void onPatch(game.gameId, { featured: !game.featured })}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                game.featured ? "bg-amber-500/20 text-amber-300" : "bg-white/[0.06] text-muted-foreground"
              }`}
            >
              {game.featured ? "Featured" : "Not featured"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Tag"
              value={game.tag ?? ""}
              onSave={(v) => void onPatch(game.gameId, { tag: v || null })}
            />
            <Field
              label="RTP"
              value={game.rtp ?? ""}
              onSave={(v) => void onPatch(game.gameId, { rtp: v || null })}
            />
            <Field
              label="Min bet"
              value={game.minBet ?? ""}
              onSave={(v) => void onPatch(game.gameId, { minBet: v || null })}
            />
            <Field
              label="Max bet"
              value={game.maxBet ?? ""}
              onSave={(v) => void onPatch(game.gameId, { maxBet: v || null })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onSave(local);
        }}
        className="mt-1 h-9 rounded-lg border-amber-500/20 bg-white/[0.06] text-xs text-foreground"
      />
    </label>
  );
}
