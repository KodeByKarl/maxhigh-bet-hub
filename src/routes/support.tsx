import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Headphones,
  Mail,
  LifeBuoy,
  MessageCircle,
  ChevronLeft,
  Search,
  ChevronDown,
  Coins,
  PlayCircle,
  Settings,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { MessengerChat } from "@/components/maxhigh/MessengerChat";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Live Support — MaxHigh" },
      { name: "description", content: "Get help from the MaxHigh support team, 24/7." },
      { property: "og:title", content: "Live Support — MaxHigh" },
      { property: "og:description", content: "Get help from the MaxHigh support team, 24/7." },
    ],
  }),
  component: SupportPage,
});

type FaqItem = {
  question: { en: string; tl: string };
  answer: { en: string; tl: string };
  category: "funds" | "games" | "account" | "races";
};

const FAQ_ITEMS: FaqItem[] = [
  // Funds
  {
    category: "funds",
    question: {
      en: "How do I deposit funds into my account?",
      tl: "Paano mag-deposit ng pera sa aking account?",
    },
    answer: {
      en: "To deposit, click the purple 'Deposit' button at the top right of the page. Select your payment provider (GCash or PayMaya), enter your desired deposit amount (minimum ₱100.00), and transfer the funds. Deposits are credited instantly after superadmin approval.",
      tl: "Para mag-deposit, i-click ang lilang 'Mag-deposit' button sa kanang itaas ng screen. Pumili sa GCash o PayMaya, ilagay ang nais mong halaga (minimum ₱100.00), at magpadala ng pera. Awtomatikong papasok ito sa iyong balanse matapos aprubahan ng superadmin.",
    },
  },
  {
    category: "funds",
    question: {
      en: "How long do withdrawals take to process?",
      tl: "Gaano katagal bago matanggap ang withdraw?",
    },
    answer: {
      en: "Withdrawals are processed very fast! Once you request a withdrawal by entering your amount and GCash account details, our superadmins review it. The standard processing time is 2-5 minutes. The maximum withdrawal limit is ₱100,000.00 per transaction.",
      tl: "Napakabilis ng withdrawals! Kapag nag-withdraw ka sa pamamagitan ng paglalagay ng halaga at iyong GCash account, susuriin ito ng superadmin. Karaniwang natatapos ito sa loob ng 2-5 minuto. Ang pinakamalaking pwedeng i-withdraw ay ₱100,000.00 kada transaksyon.",
    },
  },
  // Games
  {
    category: "games",
    question: {
      en: "How does the Ante Bet feature work in slots?",
      tl: "Paano gumagana ang Ante Bet sa mga slots?",
    },
    answer: {
      en: "The Ante Bet feature increases your active bet size by 25% but doubles your chance of triggering the Free Spins feature naturally by adding extra scatter symbols to the reels.",
      tl: "Ang Ante Bet ay nagdaragdag ng 25% sa iyong pusta, ngunit dinodoble nito ang tsansa mong makakuha ng Free Spins sa pamamagitan ng pagdaragdag ng mas maraming scatter symbol sa laro.",
    },
  },
  {
    category: "games",
    question: {
      en: "How do I trigger Free Spins in Candy Peak & Sugar Surge?",
      tl: "Paano makuha ang Free Spins sa Candy Peak at Sugar Surge?",
    },
    answer: {
      en: "You can trigger the Free Spins feature in two ways: naturally landing 4 or more Scatter symbols on the reels during any spin, or by using the 'Buy Free Spins' option in the game panel for 100x your current base bet amount.",
      tl: "Maaari mong makuha ang Free Spins sa dalawang paraan: natural na paglapag ng 4 o higit pang Scatter symbol sa reels, o sa pagbili ng 'Buy Free Spins' sa panel ng laro sa halagang 100x ng iyong kasalukuyang pusta.",
    },
  },
  // Account
  {
    category: "account",
    question: {
      en: "How do I hide my wallet balance for privacy?",
      tl: "Paano ko itatago ang aking balanse para sa privacy?",
    },
    answer: {
      en: "Go to Settings (click your avatar at the top right -> Settings) and toggle the 'Hide balance in header' switch. Your balance across the header and sidebar will be replaced character-by-character with bullet points (•) for maximum privacy.",
      tl: "Pumunta sa Settings (i-click ang iyong avatar sa kanang itaas -> Settings) at i-on ang 'Itago ang balanse sa itaas' switch. Ang iyong balanse sa itaas at sidebar ay mapapalitan ng mga tuldok (•) para sa iyong privacy.",
    },
  },
  {
    category: "account",
    question: {
      en: "What are the rules for password updates and what is AutoSave?",
      tl: "Ano ang mga patakaran sa bagong password at ano ang AutoSave?",
    },
    answer: {
      en: "Password updates require at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character. If AutoSave is toggled on, the system will automatically submit your changes 1 second after you stop typing once all validation rules are met.",
      tl: "Ang bagong password ay dapat may hindi bababa sa 8 characters, may malaking titik, maliit na titik, numero, at espesyal na karakter. Kapag naka-on ang AutoSave, awtomatikong isusumite ng system ang iyong bagong password 1 segundo pagkatapos mong mag-type kapag natupad ang lahat ng patakaran.",
    },
  },
  // Races
  {
    category: "races",
    question: {
      en: "How do I join Daily or Weekly races?",
      tl: "Paano ako sasali sa Daily o Weekly races?",
    },
    answer: {
      en: "Participation is 100% automatic! Every bet you place on slot games adds to your active wagering volume. Top players on the leaderboard at the end of the day or week win cash prizes directly credited to their wallet balance.",
      tl: "Awtomatiko ang iyong pagsali! Bawat pusta mo sa mga slot game ay idinaragdag sa iyong kabuuang pusta. Ang mga nangungunang manlalaro sa leaderboard sa katapusan ng araw o linggo ay mananalo ng premyong cash na direktang idadagdag sa kanilang balanse.",
    },
  },
];

function SupportPage() {
  const { t, lang } = useTranslation();
  const [activeOption, setActiveOption] = useState<"menu" | "chat" | "help">("menu");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Filtered FAQ Items
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const questionText = item.question[lang].toLowerCase();
      const answerText = item.answer[lang].toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = questionText.includes(query) || answerText.includes(query);
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, lang]);

  const categories = [
    { id: "funds", label: lang === "tl" ? "Pera at Transaksyon" : "Funds & Banking", icon: Coins, color: "#10B981" },
    { id: "games", label: lang === "tl" ? "Mga Gabay sa Laro" : "Games & Slots", icon: PlayCircle, color: "#EF4444" },
    { id: "account", label: lang === "tl" ? "Account at Seguridad" : "Account Settings", icon: Settings, color: "#8B5CF6" },
    { id: "races", label: lang === "tl" ? "Karera at Paligsahan" : "Races & Promos", icon: Trophy, color: "#F59E0B" },
  ];

  return (
    <>
      <PageHeader
        title={t("Live Support")}
        description={t("We're online 24/7 — average response 2 minutes.")}
        icon={Headphones}
        accent="#0E7490"
      />

      {activeOption === "menu" && (
        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveOption("chat")}
            className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-5 text-left hover:bg-panel-hover transition-colors"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-white">
              <MessageCircle size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-wide text-foreground">
                {t("Live Chat")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("Fastest way to reach us")}
              </div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-5 text-left hover:bg-panel-hover transition-colors"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0E7490] text-white">
              <Mail size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-wide text-foreground">
                {t("Email")}
              </div>
              <div className="text-xs text-muted-foreground">support@maxhigh.gg</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveOption("help")}
            className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-5 text-left hover:bg-panel-hover transition-colors"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#EAB308] text-white">
              <LifeBuoy size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-wide text-foreground">
                {t("Help Center")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("Guides & FAQ")}
              </div>
            </div>
          </button>
        </div>
      )}

      {activeOption === "chat" && (
        <div className="flex flex-col rounded-3xl border border-border bg-panel overflow-hidden h-[650px] shadow-sm w-full">
          <MessengerChat onBack={() => setActiveOption("menu")} />
        </div>
      )}

      {activeOption === "help" && (
        <div className="flex flex-col rounded-3xl border border-border bg-panel p-5 sm:p-6 space-y-6">
          {/* Header row with back arrow */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <button
              type="button"
              onClick={() => {
                setActiveOption("menu");
                setSelectedCategory(null);
                setSearchQuery("");
                setExpandedIndex(null);
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-panel-hover hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <div>
              <h2 className="text-base font-black text-foreground">
                {lang === "tl" ? "Gabay at Help Center" : "Help Center & Guides"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lang === "tl" 
                  ? "Suriin ang mga gabay tungkol sa aming mga laro, deposits, at settings." 
                  : "Find answers and detailed instructions on how to use MaxHigh."}
              </p>
            </div>
          </div>

          {/* Search bar & Category filters */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "tl" ? "Maghanap ng paksa o gabay..." : "Search topics, banking, slots guides..."}
                className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border bg-panel outline-none focus:border-primary transition-colors text-sm text-foreground placeholder-muted-foreground"
              />
            </div>

            {/* Category tags */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                  selectedCategory === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-panel text-muted-foreground border-border hover:bg-panel-hover hover:text-foreground"
                )}
              >
                {lang === "tl" ? "Lahat ng Paksa" : "All Categories"}
              </button>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-panel text-muted-foreground border-border hover:bg-panel-hover hover:text-foreground"
                    )}
                  >
                    <Icon size={13} style={{ color: active ? undefined : cat.color }} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FAQ Accordion list */}
          <div className="space-y-2">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground space-y-1">
                <p>{lang === "tl" ? "Walang nahanap na resulta." : "No guides found matching your search."}</p>
                <p className="text-xs text-muted-foreground/60">
                  {lang === "tl" ? "Subukang gumamit ng ibang keywords." : "Try using different keywords or categories."}
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-border rounded-2xl overflow-hidden bg-panel-hover/20 hover:bg-panel-hover/30 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      className="flex w-full items-center justify-between p-4 text-left focus:outline-none"
                    >
                      <span className="text-sm font-bold text-foreground pr-4">
                        {faq.question[lang]}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "text-muted-foreground shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-180 text-primary"
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-border/50 text-xs leading-relaxed text-muted-foreground animate-slide-down">
                        {faq.answer[lang]}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
