import { cn } from "@/lib/utils";
import type { SuperGameRow } from "@/lib/superadmin-types";

type Props = {
  game: SuperGameRow;
  onPatch: (data: { enabled?: boolean; featured?: boolean }) => Promise<void>;
};

function SwitchRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/[0.06] px-4 py-3 hover:bg-white/[0.07]">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-amber-500" : "bg-amber-500/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}

/** Lobby visibility switches — hide a title from the casino site without changing engine math. */
export function LobbyVisibilityToggles({ game, onPatch }: Props) {
  return (
    <div className="space-y-2">
      <SwitchRow
        checked={game.enabled}
        onChange={() => void onPatch({ enabled: !game.enabled })}
        label="Enabled on lobby"
        hint="Off hides this title from players."
      />
      <SwitchRow
        checked={game.featured}
        onChange={() => void onPatch({ featured: !game.featured })}
        label="Featured"
        hint="Highlight in featured / promo placements."
      />
    </div>
  );
}
