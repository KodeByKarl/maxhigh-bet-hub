import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  createPromotionFn,
  listPromotionsFn,
  togglePromotionFn,
  listCarouselSlidesFn,
  createCarouselSlideFn,
  deleteCarouselSlideFn,
  toggleCarouselSlideFn,
} from "@/functions/superadmin";
import type { PromotionRow, CarouselSlideRow } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { saGlass } from "@/components/superadmin/ui/glass";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gift, Plus, Tag, Image as ImageIcon, Trash2 } from "lucide-react";

export const Route = createFileRoute("/superadmin/promotions")({
  component: SuperPromotionsPage,
});

function SuperPromotionsPage() {
  const { user, isReady } = useAuth();
  const [promos, setPromos] = useState<PromotionRow[]>([]);
  const [slides, setSlides] = useState<CarouselSlideRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Promo form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [bonusPercent, setBonusPercent] = useState(100);
  const [maxBonus, setMaxBonus] = useState(1000);
  const [wageringMultiplier, setWageringMultiplier] = useState(15);
  const [creating, setCreating] = useState(false);

  // Carousel form state
  const [badge, setBadge] = useState("Announcement");
  const [slideTitle, setSlideTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [sub, setSub] = useState("");
  const [cta, setCta] = useState("Claim Now");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("/promos/promo-daily-race.png");
  const [creatingSlide, setCreatingSlide] = useState(false);

  const load = async () => {
    try {
      const [pData, sData] = await Promise.all([
        listPromotionsFn(),
        listCarouselSlidesFn().catch(() => []),
      ]);
      setPromos(pData);
      setSlides(sData);
    } catch {
      setPromos([]);
      setSlides([]);
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

  async function handleCreateSlide(e: FormEvent) {
    e.preventDefault();
    if (!slideTitle.trim() || !headline.trim() || !imageUrl.trim()) {
      return toast.error("Please fill required fields (Title, Headline, Image URL)");
    }
    setCreatingSlide(true);
    try {
      await createCarouselSlideFn({
        data: {
          badge,
          title: slideTitle,
          headline,
          sub: sub || undefined,
          cta,
          linkUrl: linkUrl || undefined,
          imageUrl,
        },
      });
      toast.success(`Carousel banner '${slideTitle}' added!`);
      setSlideTitle("");
      setHeadline("");
      setSub("");
      setLinkUrl("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add banner");
    } finally {
      setCreatingSlide(false);
    }
  }

  async function handleDeleteSlide(id: string, title: string) {
    if (!confirm(`Delete carousel banner '${title}'?`)) return;
    try {
      await deleteCarouselSlideFn({ data: { id } });
      toast.success(`Deleted banner '${title}'`);
      await load();
    } catch {
      toast.error("Failed to delete banner");
    }
  }

  async function handleToggleSlide(id: string, current: boolean) {
    try {
      await toggleCarouselSlideFn({ data: { id, enabled: !current } });
      toast.success("Banner visibility updated");
      await load();
    } catch {
      toast.error("Failed to update banner status");
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Promotions & Dashboard Carousel Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage promotional bonus codes, match caps, and live home/promotions page carousel banners.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
          <ImageIcon className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-black text-foreground uppercase tracking-wide">Home & Promo Dashboard Carousel Banners</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={handleCreateSlide} className={`${saGlass} p-5 space-y-3.5 lg:col-span-1`}>
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-amber-400" />
              <h3 className="text-base font-bold text-foreground">Add New Banner Slide</h3>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Badge Label</label>
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. Daily" required className="bg-white/[0.06] text-foreground h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Title</label>
              <Input value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} placeholder="e.g. Daily Race" required className="bg-white/[0.06] text-foreground h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Headline</label>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Join & Win Big" required className="bg-white/[0.06] text-foreground h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Subtitle</label>
              <Input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="e.g. Compete for rewards" className="bg-white/[0.06] text-foreground h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Button Text</label>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Claim" required className="bg-white/[0.06] text-foreground h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Target URL</label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="bg-white/[0.06] text-foreground h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Image URL</label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/promos/img.png" required className="bg-white/[0.06] text-foreground h-9 text-xs" />
            </div>
            <button type="submit" disabled={creatingSlide} className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50">
              {creatingSlide ? "Adding…" : "Add Banner Slide"}
            </button>
          </form>

          <div className={`${saGlass} p-5 lg:col-span-2 overflow-x-auto`}>
            <h3 className="text-base font-bold text-foreground mb-4">Active Dashboard Banners</h3>
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading carousel slides…</div>
            ) : slides.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No slides configured.</div>
            ) : (
              <div className="grid gap-3">
                {slides.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3">
                      <img src={s.imageUrl} alt="" className="h-12 w-20 rounded-lg object-cover border border-amber-500/20" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">{s.badge}</span>
                          <span className="font-bold text-foreground text-sm">{s.title}</span>
                        </div>
                        <div className="text-xs font-semibold text-amber-400 mt-0.5">{s.headline}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void handleToggleSlide(s.id, s.enabled)} className={["rounded-lg px-2.5 py-1 text-xs font-bold transition-colors", s.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"].join(" ")}>
                        {s.enabled ? "Active" : "Hidden"}
                      </button>
                      <button type="button" onClick={() => void handleDeleteSlide(s.id, s.title)} className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
          <Gift className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-black text-foreground uppercase tracking-wide">Promotional Bonus Codes</h2>
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
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME100" className="h-10 border-amber-500/20 bg-white/[0.06] uppercase text-foreground" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="100% First Deposit Bonus" className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Match %</label>
                <Input type="number" value={bonusPercent} onChange={(e) => setBonusPercent(Number(e.target.value))} className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Max Bonus (₱)</label>
                <Input type="number" value={maxBonus} onChange={(e) => setMaxBonus(Number(e.target.value))} className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Rollover (x)</label>
              <Input type="number" value={wageringMultiplier} onChange={(e) => setWageringMultiplier(Number(e.target.value))} className="h-10 border-amber-500/20 bg-white/[0.06] text-foreground" />
            </div>
            <button type="submit" disabled={creating} className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50">
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
                        <button type="button" onClick={() => void handleToggle(p.id, p.enabled)} className={["rounded-lg px-2.5 py-1 text-xs font-bold transition-colors", p.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"].join(" ")}>
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
    </div>
  );
}
