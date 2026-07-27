import { useEffect, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Headphones,
  CheckCircle,
  Send,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import {
  getAdminTicketsFn,
  getAdminTicketMessagesFn,
  sendAdminMessageFn,
  resolveSupportTicketFn,
  assignAgentToTicketFn,
} from "@/functions/api";
import { adminGlass } from "@/components/admin/ui/glass";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupportPage,
});

type Ticket = {
  id: string;
  userId: string;
  username: string;
  status: string;
  createdAt: string;
};

type Message = {
  id: string;
  ticketId: string;
  sender: "user" | "agent";
  text: string;
  createdAt: string;
};

function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollTicketsIntervalRef = useRef<number | null>(null);
  const pollMessagesIntervalRef = useRef<number | null>(null);

  // Load and poll tickets list
  useEffect(() => {
    async function loadTickets() {
      try {
        const list = await getAdminTicketsFn();
        setTickets(list);
      } catch (err) {
        console.error("Error fetching admin tickets:", err);
      }
    }
    void loadTickets();

    pollTicketsIntervalRef.current = window.setInterval(loadTickets, 4000);
    return () => {
      if (pollTicketsIntervalRef.current) {
        window.clearInterval(pollTicketsIntervalRef.current);
      }
    };
  }, []);

  // Poll messages when ticket selected
  useEffect(() => {
    if (pollMessagesIntervalRef.current) {
      window.clearInterval(pollMessagesIntervalRef.current);
      pollMessagesIntervalRef.current = null;
    }

    async function loadMessages() {
      if (!selectedTicket) return;
      try {
        const list = await getAdminTicketMessagesFn({ data: { ticketId: selectedTicket.id } });
        setMessages(list);
      } catch (err) {
        console.error("Error fetching ticket messages:", err);
      }
    }

    if (selectedTicket) {
      void loadMessages();
      pollMessagesIntervalRef.current = window.setInterval(loadMessages, 2500);
    } else {
      setMessages([]);
    }

    return () => {
      if (pollMessagesIntervalRef.current) {
        window.clearInterval(pollMessagesIntervalRef.current);
      }
    };
  }, [selectedTicket]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSelectTicket(t: Ticket) {
    setSelectedTicket(t);
    try {
      await assignAgentToTicketFn({ data: { ticketId: t.id } });
      const list = await getAdminTicketsFn();
      setTickets(list);
    } catch (err) {
      console.error("Error assigning agent to ticket:", err);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !inputText.trim() || isSending) return;

    const textToSend = inputText;
    setInputText("");
    setIsSending(true);

    try {
      // Optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          ticketId: selectedTicket.id,
          sender: "agent" as const,
          text: textToSend,
          createdAt: new Date().toISOString(),
        },
      ]);

      await sendAdminMessageFn({ data: { ticketId: selectedTicket.id, text: textToSend } });
      
      const list = await getAdminTicketMessagesFn({ data: { ticketId: selectedTicket.id } });
      setMessages(list);
    } catch (err) {
      console.error("Error sending admin message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleResolveConfirm() {
    if (!selectedTicket) return;

    try {
      const res = await resolveSupportTicketFn({ data: { ticketId: selectedTicket.id } });
      if (res.ok) {
        toast.success(`Ticket for @${selectedTicket.username} marked resolved and closed.`);
        setSelectedTicket(null);
        setResolveConfirmOpen(false);
        // Refresh ticket list
        const list = await getAdminTicketsFn();
        setTickets(list);
      } else {
        toast.error("Failed to resolve ticket");
      }
    } catch (err) {
      console.error("Error resolving ticket:", err);
      toast.error("Error resolving ticket");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Live Support Tickets</h1>
        <p className="mt-1 text-sm text-violet-200/60">
          Chat with players and resolve support requests.
        </p>
      </div>

      <div className={cn("grid gap-5 lg:grid-cols-[300px_1fr] h-[650px]", adminGlass, "p-0 overflow-hidden border border-white/10 rounded-2xl")}>
        {/* Left Side: Tickets List */}
        <div className="flex flex-col border-r border-white/10 overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3 bg-white/[0.02]">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
              Open Conversations ({tickets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center text-xs text-white/40 gap-2">
                <MessageCircle size={24} className="text-white/20 animate-pulse" />
                <span>No open tickets currently.</span>
              </div>
            ) : (
              tickets.map((t) => {
                const active = selectedTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void handleSelectTicket(t)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      active
                        ? "bg-gradient-to-r from-violet-600/50 to-fuchsia-600/40 text-white border border-violet-500/30"
                        : "hover:bg-white/[0.04] text-white/70 hover:text-white"
                    )}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600/30 text-violet-200 text-xs font-black uppercase">
                      {t.username.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate text-white">@{t.username}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        Open: {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Message Window */}
        <div className="flex flex-col overflow-hidden h-full bg-white/[0.01]">
          {selectedTicket ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600/30 text-violet-200 text-xs font-black uppercase">
                    {selectedTicket.username.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">@{selectedTicket.username}</div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      <span>●</span> Active Player
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setResolveConfirmOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 transition-colors"
                >
                  <CheckCircle size={14} /> Resolve Ticket
                </button>
              </div>

              {/* Chat Stream */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-black/10"
              >
                {messages.map((msg) => {
                  const isAgent = msg.sender === "agent";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full flex-col max-w-[85%]",
                        isAgent ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className="flex items-end gap-2">
                        {!isAgent && (
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-white/80 text-[10px] font-black uppercase">
                            {selectedTicket.username.slice(0, 2)}
                          </div>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            isAgent
                              ? "bg-violet-600/80 text-white rounded-br-none border border-violet-500/25"
                              : "bg-white/10 text-white/90 rounded-bl-none border border-white/5"
                          )}
                        >
                          {msg.text}
                        </div>
                        {isAgent && (
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-600/40 text-violet-200 text-[10px] font-bold uppercase">
                            AD
                          </div>
                        )}
                      </div>
                      <span className="mt-1 text-[9px] font-semibold text-white/30 uppercase tracking-wider px-9">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Footer Input */}
              <form onSubmit={handleSend} className="border-t border-white/10 p-4 bg-white/[0.01]">
                <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] border border-white/5 px-3 py-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type reply to player..."
                    className="flex-1 bg-transparent border-0 text-sm text-white placeholder-white/30 outline-none ring-0 focus:ring-0 px-2 h-8"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-violet-600 text-white transition-all hover:scale-105 hover:bg-violet-500 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-600/10 text-violet-400 animate-pulse">
                <Headphones size={28} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Live Support Dashboard</h3>
                <p className="text-xs text-white/40 mt-1 max-w-sm">
                  Select an active player chat from the left column list to review the issue and respond.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Confirmation Modal */}
      {selectedTicket && (
        <Dialog open={resolveConfirmOpen} onOpenChange={setResolveConfirmOpen}>
          <DialogContent className="max-w-sm border-white/10 bg-[#160f29] text-white rounded-2xl p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-black text-white">Close Support Ticket</DialogTitle>
              <DialogDescription className="text-white/60 text-xs mt-1">
                Are you sure to Close this Ticket? This will delete the ticket and message history from the database permanently and notify the player.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-4 flex justify-end">
              <DialogClose asChild>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-transparent text-white/65 hover:bg-white/[0.05] hover:text-white px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="button"
                onClick={() => void handleResolveConfirm()}
                className="rounded-full bg-emerald-600 text-white hover:bg-emerald-500 border-0 px-4 py-2 text-xs font-bold"
              >
                Yes, Close Ticket
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
