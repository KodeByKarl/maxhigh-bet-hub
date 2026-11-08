/** First-transfer preview: no authentication, RPC or financial handlers run. */
export function stagingPreviewResponse(request: Request): Response | undefined {
  if (process.env.STAGING_READ_ONLY !== "1") return undefined;
  const url = new URL(request.url);
  const read = request.method === "GET" || request.method === "HEAD";
  if (read && url.pathname === "/api/health") return undefined;
  // Only literal static paths; reject alternate encoded separators/traversal.
  if (
    read &&
    !/[%\\]/.test(url.pathname) &&
    /^\/(assets|images|fonts|audio|sounds)\/[A-Za-z0-9_./ -]+$/.test(url.pathname)
  )
    return undefined;
  return new Response(
    request.method === "HEAD"
      ? null
      : "Staging preview only. Application and financial actions are disabled.",
    {
      status: read && url.pathname === "/" ? 200 : 423,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Maxhigh-Preview": "read-only",
      },
    },
  );
}
