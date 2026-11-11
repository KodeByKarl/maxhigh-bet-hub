import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Info, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/currency";
import { buyBonusTotal } from "@/lib/buy-bonus";
import { realmsBuyPricePerSpin } from "@/lib/realms";
import type { RealmsGameDef } from "@/lib/realms/catalog";
import type { RealmsConfig } from "@/lib/realms/schema";
import { cn } from "@/lib/utils";

/**
 * In-app guide for the Realms engine configuration (GitBook-style: a topic tree on the left, one article on the right).
 * Documentation only. It reads the current draft to make examples concrete and never changes a value.
 */

export type GuideKey =
  | "overview"
  | "lobbyTag"
  | "lobbyRtp"
  | "lobbyVolatility"
  | "lobbyMinBet"
  | "lobbyMaxBet"
  | "deadSpin"
  | "seedBias"
  | "seedClusterMin"
  | "seedClusterMax"
  | "maxWin"
  | "symbolWeight"
  | "symbolPay"
  | "bombChanceBase"
  | "bombChanceFs"
  | "bombCapBase"
  | "bombCapFs"
  | "bombWeights"
  | "fsTrigger"
  | "fsAwarded"
  | "retriggerScatters"
  | "retriggerSpins"
  | "sessionCap"
  | "buyPrice"
  | "buyTable"
  | "anteCost"
  | "anteBoost";

type Ctx = { cfg: RealmsConfig; def: RealmsGameDef };

type Topic = {
  section: string;
  title: string;
  /** One-sentence answer. */
  short: string;
  /** Plain-language explanation, one paragraph per entry. */
  how: string[];
  /** A worked example built from the live draft. */
  example?: (c: Ctx) => string;
  /** Things to know before changing it. */
  notes?: string[];
  /** True when changing it moves the game's real RTP. */
  movesRtp?: boolean;
  related?: GuideKey[];
};

const peso = (n: number) => formatMoney(n);

const GUIDE: Record<GuideKey, Topic> = {
  overview: {
    section: "Start here",
    title: "How this configuration works",
    short:
      "Each field below changes how this one game behaves. Changes are saved per game and apply to rounds started after you save.",
    how: [
      "Lobby fields are labels shown to players. Hit rate, Symbols, Multipliers and Free spins & buy are the game's math: they decide how often and how much the game pays.",
      "The server reads the saved values on every round and every Buy Bonus, so what you save is what is charged and paid. The player screen only displays it.",
      "Every save is written to the audit log with your account name.",
    ],
    notes: [
      "The defaults were calibrated so the game returns about 96% over the long run (RTP). Changing pays, weights, prices or the ante boost moves that number.",
      "After deliberate math changes, re-run scripts/realms/calibrate-realms.ts to measure the new RTP before going live.",
      "Use “Calibrated defaults” at the top to go back to the measured values (it only fills the form; nothing is saved until you press Save Config).",
    ],
    related: ["buyPrice", "deadSpin", "symbolWeight"],
  },

  lobbyTag: {
    section: "Lobby",
    title: "Tag / Badge",
    short: "A small label on the game's card in the lobby, such as NEW or HOT.",
    how: ["Free text. It is shown on the card only and has no effect on gameplay, math or RTP."],
    example: () => "Tag “HOT” shows a HOT badge on the Abyssal Pearls card.",
  },
  lobbyRtp: {
    section: "Lobby",
    title: "RTP (display)",
    short: "The return-to-player text shown to players in the lobby and game info.",
    how: [
      "This is only text. It does not change what the game pays. The real RTP comes from the symbol weights, pays, buy price and ante settings.",
    ],
    example: () =>
      "“96.0%” tells players that, over a very long time, ₱100 wagered returns about ₱96.",
    notes: [
      "Keep it in line with the calibrated value so the lobby never promises more or less than the math delivers.",
    ],
    related: ["overview"],
  },
  lobbyVolatility: {
    section: "Lobby",
    title: "Volatility",
    short: "A label describing how swingy the game feels (Low, Medium, High, Very High).",
    how: ["Display text only. High volatility means fewer wins that can be larger."],
    example: () => "“High” tells players to expect longer quiet stretches and bigger single wins.",
  },
  lobbyMinBet: {
    section: "Lobby",
    title: "Min Bet",
    short: "The smallest bet the server will accept for this game.",
    how: [
      "The server checks every wager against this range and refuses bets outside it. Write it like ₱0.20.",
      "Players choose from the bet ladder (₱0.20 to ₱100). A bet outside your range simply cannot be placed.",
    ],
    example: () => "Min Bet ₱0.20 means a ₱0.10 wager is refused.",
    related: ["lobbyMaxBet"],
  },
  lobbyMaxBet: {
    section: "Lobby",
    title: "Max Bet",
    short: "The largest bet the server will accept for this game.",
    how: ["Same rule as Min Bet, from the top. Write it like ₱100."],
    example: () => "Max Bet ₱100 means a ₱200 wager is refused.",
    notes: [
      "Lowering it also lowers the biggest possible win, because wins are a multiple of the bet.",
    ],
    related: ["lobbyMinBet", "maxWin"],
  },

  deadSpin: {
    section: "Hit rate",
    title: "Dead spin chance (%)",
    short:
      "How often a round starts from a plain random board instead of one with a winning cluster placed in it.",
    how: [
      "At the start of a round the engine rolls once. With the dead-spin percentage, it fills the board randomly (it can still win by chance). Otherwise it first places a small cluster of low-value symbols so the round starts with a win.",
      "A higher number means fewer rounds start with a placed cluster, so quiet spins are more common. A lower number means small wins are more frequent.",
    ],
    example: ({ cfg }) =>
      `At ${cfg.deadSpinChancePercent}%, about ${Math.round(cfg.deadSpinChancePercent / 10)} of every 10 rounds start from a plain random board and ${10 - Math.round(cfg.deadSpinChancePercent / 10)} start with a placed cluster.`,
    movesRtp: true,
    notes: ["The calibrated value is shown beside the field."],
    related: ["seedBias", "seedClusterMin", "seedClusterMax"],
  },
  seedBias: {
    section: "Hit rate",
    title: "Seed bias toward Q (%)",
    short: "When a cluster is placed, how often it uses the Q symbol.",
    how: [
      "Placed clusters use the low-value symbols (10, J, Q, K, A). This setting is the chance the cluster uses the third one (Q); otherwise one of the low symbols is picked at random.",
    ],
    example: ({ cfg }) =>
      `At ${cfg.seedBiasPercent}%, about ${Math.round(cfg.seedBiasPercent)} of every 100 placed clusters are Q.`,
    movesRtp: true,
  },
  seedClusterMin: {
    section: "Hit rate",
    title: "Seed cluster min",
    short: "The smallest placed cluster, in symbols.",
    how: [
      "Each placed cluster gets a random size between Min and Max. A cluster only pays when it reaches the game's minimum cluster size.",
    ],
    example: ({ cfg }) =>
      `Min ${cfg.seedClusterMin} and Max ${cfg.seedClusterMax}: each placed cluster has ${cfg.seedClusterMin} to ${cfg.seedClusterMax} matching symbols.`,
    notes: [
      "Keep Min at or above this game's minimum cluster so every placed cluster is a real win.",
    ],
    movesRtp: true,
    related: ["seedClusterMax"],
  },
  seedClusterMax: {
    section: "Hit rate",
    title: "Seed cluster max",
    short: "The largest placed cluster, in symbols.",
    how: ["Bigger clusters pay more. See Seed cluster min for how the size is chosen."],
    movesRtp: true,
    related: ["seedClusterMin"],
  },
  maxWin: {
    section: "Hit rate",
    title: "Max win multiplier (× bet)",
    short: "The most one round can pay, as a multiple of the bet.",
    how: [
      "If a round would pay more than bet × this number, the payout is cut down to that limit.",
    ],
    example: ({ cfg }) =>
      `At ${cfg.maxWinMult}×: a ₱1.00 bet can win at most ${peso(cfg.maxWinMult)}, and a ₱10.00 bet at most ${peso(cfg.maxWinMult * 10)}.`,
    notes: ["The game info screen mentions a maximum win. Keep the two consistent."],
    related: ["lobbyMaxBet"],
  },

  symbolWeight: {
    section: "Symbols",
    title: "Symbol weight",
    short: "How often a symbol lands compared with the others.",
    how: [
      "Weights are relative. A symbol's share is its weight divided by the total of all weights; the percentage under each symbol name shows the result.",
      "A higher weight makes the symbol appear more often, which makes clusters of it more likely.",
    ],
    example: () =>
      "If the weights add up to 100 and the Giant Oyster has weight 10, it fills about 10% of cells.",
    movesRtp: true,
    related: ["symbolPay"],
  },
  symbolPay: {
    section: "Symbols",
    title: "Pay table (cluster tiers)",
    short: "What a winning cluster pays, as a multiple of the bet.",
    how: [
      "There are three tiers: a minimum-size cluster, +2 symbols, and +4 symbols (the headings show the exact counts for this game). Bigger clusters pay more.",
      "Winning symbols tumble away and new ones drop in, so one round can pay several clusters.",
    ],
    example: () =>
      "A pay of 0.50 for the first tier means a minimum-size cluster pays 0.5 × bet: ₱0.50 on a ₱1.00 bet.",
    movesRtp: true,
    related: ["symbolWeight", "maxWin"],
  },

  bombChanceBase: {
    section: "Multipliers",
    title: "Base game chance (%)",
    short: "The chance that a cell is a multiplier orb in the base game.",
    how: [
      "Each cell has this chance of being a multiplier orb. When a winning tumble happens, the strongest orb on the board multiplies that tumble's win.",
    ],
    example: ({ cfg, def }) =>
      `${cfg.bombChanceBasePercent}% means about ${((cfg.bombChanceBasePercent / 100) * 30).toFixed(1)} ${def.bomb.name}s on a typical 30-cell board.`,
    movesRtp: true,
    related: ["bombWeights", "bombCapBase"],
  },
  bombChanceFs: {
    section: "Multipliers",
    title: "Free spins chance (%)",
    short: "The same orb chance, while free spins are running.",
    how: [
      "In free spins the orbs are collected instead of multiplying each tumble: the highest one collected is applied to the total free-spin winnings at the end.",
    ],
    movesRtp: true,
    related: ["bombCapFs"],
  },
  bombCapBase: {
    section: "Multipliers",
    title: "Base multiplier cap",
    short: "The highest multiplier that can apply to a win in the base game.",
    how: ["Even if a stronger orb lands, the multiplier used is never higher than this."],
    example: ({ cfg }) =>
      `Cap ${cfg.maxBaseBombSum}: a 5× orb would apply as ${Math.min(5, cfg.maxBaseBombSum)}×.`,
    movesRtp: true,
  },
  bombCapFs: {
    section: "Multipliers",
    title: "Free spins multiplier cap",
    short: "The highest collected multiplier that can apply to the free-spin total.",
    how: [
      "At the end of the bonus the highest collected orb (never below 1×) multiplies the bonus winnings, limited by this cap.",
    ],
    example: ({ cfg }) =>
      `Cap ${cfg.maxFsBombMult}: if the bonus won ${peso(100)} and a 5× orb was collected, the total is ${peso(100 * Math.min(5, Math.max(1, cfg.maxFsBombMult)))}.`,
    movesRtp: true,
  },
  bombWeights: {
    section: "Multipliers",
    title: "Multiplier weights (2× / 3× / 4× / 5×)",
    short: "How likely each orb value is, compared with the others.",
    how: [
      "Same idea as symbol weights: a higher weight for 5× makes 5× orbs more common relative to 2×. The percentages beside the values show the result.",
    ],
    movesRtp: true,
    related: ["bombChanceBase"],
  },

  fsTrigger: {
    section: "Free spins & buy",
    title: "Trigger scatters",
    short: "How many scatter symbols must land in one spin to start free spins.",
    how: ["When that many scatters land together, the free-spins bonus starts."],
    example: ({ cfg, def }) =>
      `${cfg.freeSpinsTriggerCount} means landing ${cfg.freeSpinsTriggerCount} ${def.scatter.name} symbols at once starts the bonus.`,
    movesRtp: true,
    related: ["fsAwarded"],
  },
  fsAwarded: {
    section: "Free spins & buy",
    title: "Free spins awarded",
    short: "How many free spins a normal trigger gives.",
    how: [
      "This is the standard award. It is also the reference size the Buy price per spin is measured at.",
    ],
    example: ({ cfg }) =>
      `${cfg.freeSpinsBase} means the player gets ${cfg.freeSpinsBase} free spins.`,
    movesRtp: true,
    related: ["buyPrice", "retriggerSpins", "sessionCap"],
  },
  retriggerScatters: {
    section: "Free spins & buy",
    title: "Retrigger scatters",
    short: "How many scatters during free spins add more spins.",
    how: [
      "If this many scatters land in one free spin, the retrigger spins are added to the counter.",
    ],
    example: ({ cfg }) =>
      `${cfg.freeSpinsRetriggerCount} scatters in one free spin adds the retrigger spins.`,
    movesRtp: true,
    related: ["retriggerSpins", "sessionCap"],
  },
  retriggerSpins: {
    section: "Free spins & buy",
    title: "Retrigger spins",
    short: "How many extra spins each retrigger adds.",
    how: ["Added to the remaining spins, but never beyond the session cap."],
    example: ({ cfg }) =>
      `${cfg.freeSpinsRetrigger} adds +${cfg.freeSpinsRetrigger} spins: 2 left becomes ${2 + cfg.freeSpinsRetrigger}.`,
    movesRtp: true,
    related: ["sessionCap"],
  },
  sessionCap: {
    section: "Free spins & buy",
    title: "Session cap (spins)",
    short: "The most spins one bonus can ever run, and the most a player can buy at once.",
    how: [
      "Free spins plus all retriggers in one bonus stop at this number. A Buy Bonus quantity above it is refused by the server.",
    ],
    example: ({ cfg }) =>
      `${cfg.maxFsSessionSpins} means a bonus never runs longer than ${cfg.maxFsSessionSpins} spins and a player can buy at most ${cfg.maxFsSessionSpins} at once.`,
    movesRtp: true,
    related: ["retriggerSpins", "buyPrice"],
  },
  buyPrice: {
    section: "Free spins & buy",
    title: "Buy price (price for 1 spin)",
    short:
      "What a player pays to buy a single free spin, as a multiple of the bet. Prices for 2, 3, 4… spins are calibrated from it automatically.",
    how: [
      "You type the price of one spin. The editor works out every other quantity from the game's calibrated price curve, so the whole table stays consistent. The table under the field shows each quantity and updates as you type.",
      "The wallet is charged once: bet × price per spin × number of spins. Buying more spins costs a little more per spin than buying one, because a longer bonus is worth more per spin; the curve keeps every size equally fair.",
      "Pick a preview bet to see the amounts in pesos. Players can choose any bet on the game's fixed ladder, so the preview bets are only examples.",
    ],
    example: ({ cfg, def }) => {
      const p1 = realmsBuyPricePerSpin(def.id, cfg, 1);
      const p10 = realmsBuyPricePerSpin(def.id, cfg, def.freeSpins);
      return `Price for 1 spin = ${p1}×. At a ₱5.00 bet, 1 spin costs ${peso(buyBonusTotal(5, p1, 1))}. Buying ${def.freeSpins} spins is priced at ${p10}× each: ${peso(buyBonusTotal(5, p10, def.freeSpins))} in total.`;
    },
    movesRtp: true,
    notes: [
      "The calibrated price returns about 96%. A lower price makes buying more favourable to the player (estimated return above 96%); a higher price less favourable. The editor shows a rough estimate; re-run the calibration script to measure it.",
      "This sets a price per spin, not a flat price per “bonus”. Selling a fixed bundle at one price would need the buying format itself to change in code.",
      "Internally the value is stored as the price per spin at the standard award; the editor converts it for you.",
    ],
    related: ["buyTable", "fsAwarded", "sessionCap"],
  },
  buyTable: {
    section: "Free spins & buy",
    title: "Buy Bonus price preview",
    short: "A live table of what players would pay for each quantity of free spins.",
    how: [
      "Total wallet deduction = base bet × price per spin × number of spins.",
      "Choose a preview bet with the buttons above the table. The “standard award” row is the bonus size the game normally gives; the percentage next to each price per spin shows how much more it is than buying one spin.",
      "Players can choose any bet on the game's bet ladder (₱0.20 to ₱100) and any quantity from 1 up to the session cap. The wallet is charged once, at the total shown.",
    ],
    example: ({ cfg, def }) => {
      const q = Math.min(3, cfg.maxFsSessionSpins || 3);
      const per = realmsBuyPricePerSpin(def.id, cfg, q);
      return `Bet ${peso(2)} × ${q} spins: ${peso(2 * per)} per spin, ${peso(buyBonusTotal(2, per, q))} total.`;
    },
    related: ["buyPrice", "sessionCap"],
  },
  anteCost: {
    section: "Free spins & buy",
    title: "Ante cost (× bet)",
    short: "The extra cost of playing with Ante turned on.",
    how: [
      "With Ante on, each spin costs the bet times this number, and scatters land more often (see Ante scatter boost).",
    ],
    example: ({ cfg }) =>
      `${cfg.anteBetMult}: a ₱1.00 bet is charged ${peso(cfg.anteBetMult)} per spin; a ₱10.00 bet is charged ${peso(cfg.anteBetMult * 10)}.`,
    movesRtp: true,
    related: ["anteBoost"],
  },
  anteBoost: {
    section: "Free spins & buy",
    title: "Ante scatter boost",
    short: "How much more often scatters land when Ante is on.",
    how: ["A multiplier on the scatter weight while Ante is active. 1 means no change."],
    example: ({ cfg }) =>
      `${cfg.anteScatterWeightMult} means scatters land about ${Math.round((cfg.anteScatterWeightMult - 1) * 100)}% more often with Ante on.`,
    movesRtp: true,
    related: ["anteCost"],
  },
};

const ORDER: GuideKey[] = Object.keys(GUIDE) as GuideKey[];

// ──────────────────────────────────────────────────────────────── plumbing

const GuideContext = createContext<(key: GuideKey) => void>(() => undefined);

/** Small ⓘ button that opens the guide at a topic. Place it next to a field label. */
export function InfoButton({ topic, className }: { topic: GuideKey; className?: string }) {
  const open = useContext(GuideContext);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open(topic);
      }}
      aria-label={`Guide: ${GUIDE[topic].title}`}
      title={`Guide: ${GUIDE[topic].title}`}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-amber-400/40 text-amber-300 transition hover:border-amber-300 hover:bg-amber-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300",
        className,
      )}
    >
      <Info className="size-3" aria-hidden />
    </button>
  );
}

/** Header button that opens the guide at its overview. */
export function GuideLink() {
  const open = useContext(GuideContext);
  return (
    <button
      type="button"
      onClick={() => open("overview")}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-amber-400/40 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-400/10"
      title="Open the configuration guide"
    >
      <BookOpen size={14} aria-hidden />
      Guide
    </button>
  );
}

/** Provides the info buttons and renders the guide dialog. Wrap the config editor body in this. */
export function GuideProvider({ cfg, def, children }: Ctx & { children: ReactNode }) {
  const [topic, setTopic] = useState<GuideKey | null>(null);
  return (
    <GuideContext.Provider value={setTopic}>
      {children}
      <GuideDialog topic={topic} onTopic={setTopic} cfg={cfg} def={def} />
    </GuideContext.Provider>
  );
}

function GuideDialog({
  topic,
  onTopic,
  cfg,
  def,
}: Ctx & { topic: GuideKey | null; onTopic: (k: GuideKey | null) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      ORDER.filter((k) => {
        if (!q) return true;
        const t = GUIDE[k];
        return `${t.title} ${t.short} ${t.section}`.toLowerCase().includes(q);
      }),
    [q],
  );
  const sections = useMemo(() => {
    const out: { name: string; keys: GuideKey[] }[] = [];
    for (const k of visible) {
      const name = GUIDE[k].section;
      const last = out[out.length - 1];
      if (last && last.name === name) last.keys.push(k);
      else out.push({ name, keys: [k] });
    }
    return out;
  }, [visible]);

  const current = topic ? GUIDE[topic] : null;
  const example = current?.example?.({ cfg, def });

  return (
    <Dialog open={topic !== null} onOpenChange={(o) => !o && onTopic(null)}>
      <DialogContent className="flex h-[min(82vh,720px)] w-[min(96vw,960px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none md:flex-row">
        <DialogTitle className="sr-only">{current?.title ?? "Guide"}</DialogTitle>
        <DialogDescription className="sr-only">
          Guide for the {def.name} engine configuration
        </DialogDescription>

        <nav
          aria-label="Guide topics"
          className="flex max-h-40 shrink-0 flex-col border-b border-white/10 bg-black/30 md:max-h-none md:w-64 md:border-b-0 md:border-r"
        >
          <div className="flex items-center gap-2 px-4 pb-2 pt-4 text-sm font-bold text-amber-300">
            <BookOpen className="size-4" aria-hidden /> Config guide
          </div>
          <label className="relative mx-3 mb-2 block">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics"
              aria-label="Search guide topics"
              className="h-8 w-full rounded-md border border-white/10 bg-white/5 pl-7 pr-2 text-xs outline-none focus:border-amber-400/60"
            />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">No topics match.</p>
            )}
            {sections.map((s) => (
              <div key={s.name} className="mb-2">
                <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {s.name}
                </div>
                {s.keys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onTopic(k)}
                    aria-current={k === topic ? "page" : undefined}
                    className={cn(
                      "block w-full rounded-md px-2 py-1.5 text-left text-xs transition",
                      k === topic
                        ? "bg-amber-400/15 font-bold text-amber-200"
                        : "text-white/80 hover:bg-white/5",
                    )}
                  >
                    {GUIDE[k].title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </nav>

        <article className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] md:px-8 md:py-7 [&::-webkit-scrollbar]:hidden">
          {current && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {def.name} <span aria-hidden>›</span> {current.section}
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">{current.title}</h2>

              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  In short
                </div>
                <p className="mt-1 text-sm text-white/90">{current.short}</p>
              </div>

              <h3 className="mt-6 text-sm font-bold text-white">How it works</h3>
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-white/80">
                {current.how.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {example && (
                <>
                  <h3 className="mt-6 text-sm font-bold text-white">Example</h3>
                  <div className="mt-2 rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-white/90">
                    {example}
                  </div>
                </>
              )}

              {(current.movesRtp || (current.notes?.length ?? 0) > 0) && (
                <>
                  <h3 className="mt-6 text-sm font-bold text-white">Good to know</h3>
                  <ul className="mt-2 space-y-2 text-sm text-white/80">
                    {current.movesRtp && (
                      <li className="rounded-xl border border-orange-400/40 bg-orange-400/10 p-3">
                        <strong className="text-orange-300">Affects RTP.</strong> Changing this
                        moves the game's real return to players. Re-run the calibration script after
                        deliberate changes.
                      </li>
                    )}
                    {current.notes?.map((n, i) => (
                      <li key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        {n}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {current.related && current.related.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-bold text-white">Related</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {current.related.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => onTopic(k)}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/10"
                      >
                        {GUIDE[k].title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </article>
      </DialogContent>
    </Dialog>
  );
}
