import { useEffect, useState } from "react";
import {
  createWalletRequestFn,
  reviewWalletRequestFn,
  listMyWalletRequestsFn,
  listPendingWalletRequestsFn,
} from "@/functions/wallet";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";

type Request = { id: string; type: string; amount: number; status: string; username?: string };
export function WalletRequestsPanel({ onChanged }: { onChanged: () => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Request[]>([]);
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const reviewer = user?.role === "admin" || user?.role === "superadmin";
  const player = user?.role === "player";
  async function load() {
    setRows(reviewer ? await listPendingWalletRequestsFn() : await listMyWalletRequestsFn());
  }
  useEffect(() => {
    if (!player && !reviewer) return;
    let cancelled = false;
    (reviewer ? listPendingWalletRequestsFn() : listMyWalletRequestsFn())
      .then((value) => {
        if (!cancelled) setRows(value);
      })
      .catch(() => {
        if (!cancelled) setMessage("Unable to load wallet requests");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, player, reviewer]);
  async function submit(id?: string, decision?: "approve" | "reject") {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (id && decision) await reviewWalletRequestFn({ data: { id, decision } });
      else {
        await createWalletRequestFn({ data: { type, amount: Number(amount) } });
        setAmount("");
      }
      await load();
      onChanged();
      setMessage(
        id
          ? "Request reviewed"
          : "Request submitted for staff review. Your balance has not been credited.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  if (!player && !reviewer) return null;
  return (
    <section className="mb-4 space-y-2 rounded-xl border border-border p-3 text-xs">
      <h3 className="font-bold">{reviewer ? "Pending wallet requests" : "Wallet requests"}</h3>
      {player && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-wrap gap-2"
        >
          <label>
            Request
            <select
              aria-label="Wallet request type"
              value={type}
              onChange={(event) => setType(event.target.value as "deposit" | "withdraw")}
              className="ml-1 rounded border border-border bg-panel p-2"
            >
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="ml-1 w-24 rounded border border-border bg-panel p-2"
            />
          </label>
          <button disabled={busy} className="rounded border px-3 py-2 disabled:opacity-50">
            Submit request
          </button>
          <p className="w-full text-muted-foreground">
            Requests require staff review. Submit deposits only after arranging payment with staff;
            submitting a request does not make an external payment. Pending withdrawals reserve your
            available funds.
          </p>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {rows.length === 0 && <p>No requests to display.</p>}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded bg-muted p-2">
            {row.username && `${row.username} · `}
            {row.type} {formatMoney(row.amount)} · {row.status}
            {reviewer && (
              <span className="ml-2 inline-flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => void submit(row.id, "approve")}
                  className="rounded border px-2 py-1"
                >
                  Approve verified payment
                </button>
                <button
                  disabled={busy}
                  onClick={() => void submit(row.id, "reject")}
                  className="rounded border px-2 py-1"
                >
                  Reject
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
