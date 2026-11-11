import { useEffect, useState } from "react";
import {
  getActiveSeedPairFn,
  updateClientSeedFn,
  rotateProvablyFairSeedPairFn,
  verifyProvablyFairRoundFn,
  listMyRoundReceiptsFn,
} from "@/functions/provably-fair";
import { useAuth } from "@/lib/auth";

export function FairnessPanel() {
  const { user } = useAuth();
  const [pair, setPair] = useState<Awaited<ReturnType<typeof getActiveSeedPairFn>> | null>(null);
  const [clientSeed, setClientSeed] = useState("");
  const [revealed, setRevealed] = useState<Awaited<
    ReturnType<typeof rotateProvablyFairSeedPairFn>
  > | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipts, setReceipts] = useState<Awaited<ReturnType<typeof listMyRoundReceiptsFn>>>([]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listMyRoundReceiptsFn()
      .then((rows) => {
        if (!cancelled) setReceipts(rows);
      })
      .catch(() => {});
    getActiveSeedPairFn({ data: { userId: user.id } })
      .then((value) => {
        if (!cancelled) {
          setPair(value);
          setClientSeed(value.clientSeed);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("Unable to load your seed commitment");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  async function action(kind: "save" | "rotate" | "verify") {
    if (!user || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (kind === "save")
        await updateClientSeedFn({ data: { userId: user.id, newClientSeed: clientSeed } });
      if (kind === "rotate")
        setRevealed(await rotateProvablyFairSeedPairFn({ data: { userId: user.id } }));
      if (kind === "verify" && revealed) {
        const result = await verifyProvablyFairRoundFn({
          data: {
            serverSeed: revealed.previousServerSeed,
            clientSeed: revealed.clientSeed,
            nonce: 0,
            expectedServerSeedHash: revealed.previousServerSeedHash,
          },
        });
        setMessage(
          result.isValid
            ? "Revealed seed matches its prior commitment. This checks the seed commitment, not the entire game calculation."
            : "Seed commitment does not match",
        );
      }
      if (kind !== "verify") {
        const value = await getActiveSeedPairFn({ data: { userId: user.id } });
        setPair(value);
        setClientSeed(value.clientSeed);
        setReceipts(await listMyRoundReceiptsFn());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Seed action failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-2xl border border-border p-4">
      <h3 className="font-semibold">Game randomness commitments</h3>
      <p className="text-xs text-muted-foreground">
        Paid operations record a server-seed commitment and nonce. Rotate a seed to reveal the
        previous seed; used client seeds must be rotated before editing.
      </p>
      {pair && (
        <>
          <p className="break-all text-xs">Server seed hash: {pair.serverSeedHash}</p>
          <p className="text-xs">Nonce: {pair.nonce}</p>
        </>
      )}
      <label className="block text-sm">
        Client seed
        <input
          className="mt-1 w-full rounded border border-border bg-panel p-2"
          value={clientSeed}
          onChange={(event) => setClientSeed(event.target.value)}
          maxLength={64}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy || !pair}
          onClick={() => void action("save")}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          Save client seed
        </button>
        <button
          disabled={busy || !pair}
          onClick={() => void action("rotate")}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          Rotate and reveal previous seed
        </button>
      </div>
      {revealed && (
        <>
          <p className="break-all text-xs">Previous server seed: {revealed.previousServerSeed}</p>
          <button
            disabled={busy}
            onClick={() => void action("verify")}
            className="rounded border px-3 py-2 text-sm"
          >
            Verify previous commitment
          </button>
        </>
      )}
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
      {receipts.length > 0 && (
        <details className="text-xs">
          <summary>Recent operation receipts</summary>
          <p>
            Receipts include the round identity, committed entropy, inputs, configuration and
            result. The server seed is included only after rotation. Full replay also requires the
            recorded engine revision and any prior feature state.
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(receipts, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}
