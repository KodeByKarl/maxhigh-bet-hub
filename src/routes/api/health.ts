import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getDb } = await import("@/server/db/client");
          const { sql } = await import("drizzle-orm");
          await getDb().execute(sql`SELECT id, proof FROM financial_operations LIMIT 0`);
          await getDb().execute(
            sql`SELECT base_credited, open_game_key FROM play_sessions LIMIT 0`,
          );
          return Response.json(
            { ok: true, release: process.env.RELEASE_SHA ?? null },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch {
          return Response.json(
            { ok: false },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
