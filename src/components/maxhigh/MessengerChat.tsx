import { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Headphones,
  AlertCircle,
  ChevronLeft,
  Coins,
  ArrowDownToLine,
  Gift,
  ShieldCheck,
  User,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getSupportTicketFn, sendSupportMessageFn, createPlayerTicketFn } from "@/functions/api";
import { toast } from "sonner";

type Message = {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: Date;
};

export function MessengerChat({ onBack }: { onBack?: () => void }) {
  const { t, lang } = useTranslation();
  const prefs = usePreferences();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [formPlayerName, setFormPlayerName] = useState("");
  const [formConcern, setFormConcern] = useState("");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Set default player name when user loaded
  useEffect(() => {
    if (user) {
      setFormPlayerName(user.displayName || user.username || "");
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res = await getSupportTicketFn();
        if (res.ticket) {
          setTicketId(res.ticket.id);
          setAgentName(res.ticket.agentName || null);
          setMessages(
            res.messages.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
              timestamp: new Date(m.createdAt),
            }))
          );
        } else {
          setTicketId(null);
          setAgentName(null);
        }
      } catch (err) {
        console.error("Error loading chat ticket:", err);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  // Polling for updates
  useEffect(() => {
    async function poll() {
      try {
        const res = await getSupportTicketFn();
        
        // If ticketId was set, and the fetched ticket has a different ID or is null, it means the old one was resolved!
        if (ticketId && (!res.ticket || res.ticket.id !== ticketId)) {
          if (pollIntervalRef.current) {
            window.clearInterval(pollIntervalRef.current);
          }
          
          // Notify the player
          const rawNotifs = localStorage.getItem("maxhigh.notifications");
          let list = [];
          try {
            if (rawNotifs) list = JSON.parse(rawNotifs);
          } catch (e) {}
          
          const newNotif = {
            id: Math.random().toString(),
            title: lang === "tl" ? "Naresolba ang Support Ticket" : "Live Chat Resolved",
            body: lang === "tl" 
              ? "Ang iyong live support ticket ay naresolba at isinara ni Agent Chloe. Salamat!"
              : "Your live support ticket was resolved and closed by Agent Chloe. Thank you!",
            time: "Just now",
            type: "system" as const,
            read: false,
          };
          list.unshift(newNotif);
          localStorage.setItem("maxhigh.notifications", JSON.stringify(list));
          
          // Dispatch event to update navbar/notifications
          window.dispatchEvent(new CustomEvent("maxhigh:notifications_updated"));
          
          toast.success(
            lang === "tl" 
              ? "Naresolba na ang iyong support ticket!" 
              : "Your support ticket has been resolved!"
          );
          
          if (onBack) onBack();
          return;
        }

        // Standard update
        if (res.ticket) {
          setAgentName(res.ticket.agentName || null);
          setMessages(
            res.messages.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
              timestamp: new Date(m.createdAt),
            }))
          );
        }
      } catch (err) {
        console.error("Error polling support messages:", err);
      }
    }

    if (ticketId) {
      pollIntervalRef.current = window.setInterval(poll, 2500);
    }

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [ticketId, lang, onBack]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleStartChat(e: React.FormEvent) {
    e.preventDefault();
    if (!formPlayerName.trim() || !formConcern.trim() || isCreatingTicket) return;

    setIsCreatingTicket(true);
    try {
      const res = await createPlayerTicketFn({
        data: {
          playerName: formPlayerName,
          concern: formConcern,
        },
      });

      if (res.ok) {
        // Load messages for the ticket
        const ticketRes = await getSupportTicketFn();
        setTicketId(res.ticketId);
        setAgentName(ticketRes.ticket?.agentName || null);
        setMessages(
          ticketRes.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: new Date(m.createdAt),
          }))
        );
        toast.success(lang === "tl" ? "Nagsimula na ang chat!" : "Support ticket created!");
      }
    } catch (err) {
      console.error("Error starting chat ticket:", err);
      toast.error(lang === "tl" ? "Nabigong simulan ang chat" : "Failed to start chat session");
    } finally {
      setIsCreatingTicket(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !ticketId) return;

    const userText = inputText;
    setInputText("");
    setIsTyping(true);

    try {
      // Optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "user",
          text: userText,
          timestamp: new Date(),
        },
      ]);

      await sendSupportMessageFn({ data: { text: userText, lang } });
      
      // Instantly load new messages
      const res = await getSupportTicketFn();
      setMessages(
        res.messages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: new Date(m.createdAt),
        }))
      );
    } catch (err) {
      console.error("Error sending support message:", err);
    } finally {
      setIsTyping(false);
    }
  }

  async function triggerAutomation(actionId: string) {
    if (isTyping || !ticketId) return;

    let userText = "";

    if (actionId === "check_deposit") {
      userText = t("Check my deposit status");
    } else if (actionId === "check_withdrawal") {
      userText = t("Check my withdrawal status");
    } else if (actionId === "claim_bonus") {
      userText = t("Claim my weekly bonus");
    } else if (actionId === "security_check") {
      userText = t("Check my account security");
    }

    if (!userText) return;
    setIsTyping(true);

    try {
      // Optimistic local update
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "user",
          text: userText,
          timestamp: new Date(),
        },
      ]);

      await sendSupportMessageFn({ data: { text: userText, lang } });
      
      // Delay slightly then reload messages to get the automated agent reply
      await new Promise((resolve) => setTimeout(resolve, 900));
      const res = await getSupportTicketFn();
      setMessages(
        res.messages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: new Date(m.createdAt),
        }))
      );
    } catch (err) {
      console.error("Error triggering automation:", err);
    } finally {
      setIsTyping(false);
    }
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-panel text-muted-foreground p-8 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>{lang === "tl" ? "Sineset-up ang live support..." : "Setting up live support..."}</span>
      </div>
    );
  }

  // If no active ticket, show Form Modal first
  if (!ticketId) {
    return (
      <div className="flex h-full items-center justify-center bg-panel p-5">
        <div className="w-full max-w-md border border-border bg-panel-hover/50 p-6 sm:p-8 rounded-3xl shadow-lg relative">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute top-4 left-4 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-panel hover:text-foreground transition-colors"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
          )}

          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Headphones size={24} />
            </div>
            <h2 className="text-lg font-black text-foreground">
              {lang === "tl" ? "Simulan ang Live Support" : "Start Live Support"}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === "tl" 
                ? "Ilagay ang iyong pangalan at detalye ng concern para simulan ang chat." 
                : "Enter your name and concerns to initialize chat session."}
            </p>
          </div>

          <form onSubmit={handleStartChat} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="formPlayerName" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <User size={13} className="text-primary" />
                {lang === "tl" ? "Pangalan ng Player" : "Player Name"}
              </label>
              <input
                id="formPlayerName"
                type="text"
                value={formPlayerName}
                onChange={(e) => setFormPlayerName(e.target.value)}
                placeholder={lang === "tl" ? "Ilagay ang iyong pangalan..." : "Enter your name..."}
                required
                className="w-full h-11 rounded-2xl border border-border bg-panel px-4 text-sm text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="formConcern" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <HelpCircle size={13} className="text-primary" />
                {lang === "tl" ? "Mga Detalye ng Concern" : "Concerns"}
              </label>
              <textarea
                id="formConcern"
                value={formConcern}
                onChange={(e) => setFormConcern(e.target.value)}
                placeholder={lang === "tl" ? "Ano ang iyong concern? (hal. GCash deposit issue, game error...)" : "Describe your concern... (e.g. GCash deposit issue, game error...)"}
                required
                rows={3}
                className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingTicket || !formPlayerName.trim() || !formConcern.trim()}
              className="flex w-full h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-black text-primary-foreground hover:bg-primary/95 transition-all disabled:opacity-50"
            >
              {isCreatingTicket && <Loader2 className="h-4 w-4 animate-spin" />}
              {lang === "tl" ? "Magsimula ng Live Chat" : "Start Live Chat"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full md:grid-cols-[280px_1fr] bg-panel divide-x divide-border">
      {/* Left Column: Automated Services */}
      <div className="hidden md:flex flex-col bg-panel p-4 space-y-4 overflow-y-auto border-r border-border">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
            {t("Automated Services")}
          </h3>
          <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
            {t("Quick actions to solve problems instantly.")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {[
            { id: "check_deposit", label: t("Check Deposit Status"), icon: Coins },
            { id: "check_withdrawal", label: t("Check Withdrawal Status"), icon: ArrowDownToLine },
            { id: "claim_bonus", label: t("Claim Weekly Bonus"), icon: Gift },
            { id: "security_check", label: t("Account Security Check"), icon: ShieldCheck },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => triggerAutomation(action.id)}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-panel p-3 text-left text-xs font-bold text-foreground hover:bg-panel-hover transition-colors shadow-sm"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={14} />
                </span>
                <span className="flex-1 truncate">{action.label}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t("Select a service below to run an instant automated diagnostic checkup on your account.")}
          </p>
        </div>
      </div>

      {/* Right Column: Messenger chat stream */}
      <div className="flex h-full flex-col overflow-hidden">
        {/* Messenger Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-panel">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mr-1 -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
            )}
            <div className="relative">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Headphones size={20} />
              </div>
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-panel",
                  agentName ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                )}
              />
            </div>
            <div>
              <div className="text-sm font-black text-foreground">
                {agentName 
                  ? `Agent ${agentName}` 
                  : (lang === "tl" ? "Naghihintay ng Agent..." : "Waiting for Agent...")}
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider",
                  agentName ? "text-emerald-500" : "text-amber-500"
                )}
              >
                <span>●</span> {agentName ? t("Live") : (lang === "tl" ? "Naka-pila" : "Queued")}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
              agentName 
                ? "text-muted-foreground bg-muted" 
                : "text-amber-600 bg-amber-500/10"
            )}
          >
            <AlertCircle size={12} className={agentName ? "text-primary" : "text-amber-500"} />
            <span>
              {agentName 
                ? t("Support Agent") 
                : (lang === "tl" ? "Naka-antabay" : "Waiting")}
            </span>
          </div>
        </div>

        {/* Message List */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-panel-hover/10"
        >
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full flex-col max-w-[85%]",
                  isUser ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className="flex items-end gap-2">
                  {!isUser && (
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase">
                      {agentName ? agentName.slice(0, 1) : "C"}
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none border border-border"
                    )}
                  >
                    {msg.text}
                  </div>
                  {isUser && (
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted border border-border text-foreground text-[10px] font-bold uppercase">
                      {user?.username ? user.username.slice(0, 2) : "ME"}
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-9">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-end gap-2 max-w-[80%]">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase animate-pulse">
                {agentName ? agentName.slice(0, 1) : "C"}
              </div>
              <div className="rounded-2xl bg-muted border border-border px-4 py-3 rounded-bl-none flex gap-1.5 items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <form onSubmit={handleSend} className="border-t border-border p-4 bg-panel">
          <div className="flex items-center gap-2 rounded-2xl bg-muted border border-border px-3 py-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <Paperclip size={18} />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={lang === "tl" ? "Mag-type ng mensahe..." : "Type your message..."}
              className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder-muted-foreground outline-none ring-0 focus:ring-0 px-2 h-8"
            />
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <Smile size={18} />
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground transition-all hover:scale-105 hover:bg-primary/95 disabled:opacity-40 disabled:hover:scale-100"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
