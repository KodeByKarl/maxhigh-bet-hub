import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { createPromotionFn, listPromotionsFn, togglePromotionFn } from "@/functions/superadmin";
import type { PromotionRow } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { saGlass } from "@/components/superadmin/ui/glass";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gift, Plus, Tag } from "lucide-react";

export const Route = createFileRoute("/superadmin/promotions")({
  component: SuperPromotionsPage,
});

function SuperPromotionsPage() {
  const { user, isReady } = useAuth();
  const [promos, setPromos] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [bonusPercent, setBonusPercent] = useState(100);
  const [maxBonus, setMaxBonus] = useState(1000);
  const [wageringMultiplier, setWageringMultiplier] = useState(15);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const data = await listPromotionsFn();
      setPromos(data);
    } catch {
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load();
  }, [isReady, user]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return toast.error("Enter promo code");
    setCreating(true);
    try {
      await createPromotionFn({
        data: {
          code,
          description,
          bonusPercent,
          maxBonus,
          wageringMultiplier,
        },
      });
      toast.success(`Promo code ${code.toUpperCase()} created!`);
      setCode("");
      setDescription("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create promo");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await togglePromotionFn({ data: { id, enabled: !current } });
      toast.success("Promo status updated");
      await load();
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Promotions & Bonus Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage promotional bonus codes, match percentages, max bonus caps, and rollover multipliers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleCreate} className={`${saGlass} p-5 space-y-4 lg:col-span-1`}>
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
              <Gift size={18} />
            </div>
            <h2 className="text-base font-bold text-foreground">Create Promo Code</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Promo Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME100"
              className="h-10 border-amber-500/20 bg-white/[0.06] uppercase text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="100% First Deposit Bonus"
              className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Match %</label>
              <Input
                type="number"
                value={bonusPercent}
                onChange={(e) => setBonusPercent(Number(e.target.value))}
                className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Max Bonus (₱)</label>
              <Input
                type="number"
                value={maxBonus}
                onChange={(e) => setMaxBonus(Number(e.target.value))}
                className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Rollover / Wagering (x)</label>
            <Input
              type="number"
              value={wageringMultiplier}
              onChange={(e) => setWageringMultiplier(Number(e.target.value))}
              placeholder="15"
              className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            <Plus size={16} />
            {creating ? "Creating…" : "Create Promotion"}
          </button>
        </form>

        <div className={`${saGlass} p-5 lg:col-span-2 overflow-x-auto`}>
          <h2 className="text-base font-bold text-foreground mb-4">Active Promotions</h2>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading promos…</div>
          ) : promos.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No promo codes created yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Bonus</th>
                  <th className="py-2.5 px-3">Max Cap</th>
                  <th className="py-2.5 px-3">Rollover</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.06]">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <Tag size={14} />
                        {p.code}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.description || "—"}</div>
                    </td>
                    <td className="py-3 px-3 text-foreground font-medium">{p.bonusPercent}%</td>
                    <td className="py-3 px-3 text-foreground tabular-nums">₱{p.maxBonus.toLocaleString()}</td>
                    <td className="py-3 px-3 text-foreground">{p.wageringMultiplier}x</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => void handleToggle(p.id, p.enabled)}
                        className={[
                          "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
                          p.enabled
                            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30",
                        ].join(" ")}
                      >
                        {p.enabled ? "Active" : "Disabled"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
