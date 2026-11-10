import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { getAdminLimitStatusFn } from "@/functions/access";

/** Admin-only notice shown when no more client accounts can be added. Hidden when there is no restriction. */
export function AccountLimitNotice() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getAdminLimitStatusFn()
      .then((s) => {
        if (!cancelled) setMessage((s as { message: string | null }).message);
      })
      .catch(() => undefined); // never blocks the form; the server enforces the limit regardless
    return () => {
      cancelled = true;
    };
  }, []);
  if (!message) return null;
  return (
    <div
      role="status"
      className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200"
    >
      <Lock size={16} className="shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
