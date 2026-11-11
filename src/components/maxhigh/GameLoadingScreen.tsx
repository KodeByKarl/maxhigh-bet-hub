import { useEffect, useState, type CSSProperties } from "react";
import { ArrowLeft, RotateCw, WifiOff } from "lucide-react";
import type { SlotGame } from "@/lib/games";
import { GAME_LOADING_THEMES } from "@/lib/game-loading-themes";
import { hasRegeneratedRealmsArt } from "@/lib/realms-art";
import { realmsAssets } from "./realms/theme";
import "./game-loading-screen.css";

type Props = {
  game: SlotGame;
  gameReady?: boolean;
  slow?: boolean;
  error?: boolean;
  onArtworkReady?: () => void;
  onClose?: () => void;
};

export function GameLoadingScreen({
  game,
  gameReady = false,
  slow = false,
  error = false,
  onArtworkReady,
  onClose,
}: Props) {
  const [artwork, setArtwork] = useState<"pending" | "ready" | "unavailable">("pending");
  const theme = GAME_LOADING_THEMES[game.id];
  const hasScene = hasRegeneratedRealmsArt(game.id);
  const artworkSrc = hasScene ? realmsAssets(game.id).loadingBg : game.thumb;
  const artSettled = artwork !== "pending";

  useEffect(() => {
    let cancelled = false;
    setArtwork("pending");
    const image = new Image();
    image.src = artworkSrc;
    const assets = hasScene ? realmsAssets(game.id) : null;
    const gameImages = assets ? [assets.backdrop, ...Object.values(assets.icons)] : [];
    const gameArtworkReady = Promise.allSettled(
      gameImages.map((src) => {
        const asset = new Image();
        asset.src = src;
        return asset.decode();
      }),
    );
    Promise.all([image.decode(), gameArtworkReady]).then(
      () => {
        if (!cancelled) setArtwork("ready");
      },
      () => {
        if (!cancelled) setArtwork("unavailable");
      },
    );
    // A delayed cover must not hold an otherwise ready game indefinitely.
    const timer = window.setTimeout(() => {
      if (!cancelled) setArtwork((current) => (current === "pending" ? "unavailable" : current));
    }, 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [game.id, artworkSrc, hasScene]);

  useEffect(() => {
    if (artSettled) onArtworkReady?.();
  }, [artSettled, onArtworkReady]);

  if (!theme) return null;
  const stage = gameReady && artSettled ? 3 : artSettled ? 2 : 1;
  const status = error
    ? "We couldn't open this game"
    : slow
      ? "Taking a little longer"
      : stage === 3
        ? "Ready to play!"
        : stage === 2
          ? "Loading your game…"
          : "Preparing…";
  const style = {
    "--boot-accent": theme.accent,
    "--boot-background": theme.background,
  } as CSSProperties;

  return (
    <section
      className={`game-boot game-boot--${theme.mood} game-boot--${game.category}${hasScene ? " game-boot--illustrated" : ""}`}
      style={style}
      aria-label={`Opening ${game.name}`}
      data-game-boot={game.id}
    >
      {artwork !== "unavailable" && (
        <div
          className="game-boot__backdrop"
          style={{ backgroundImage: `url(${JSON.stringify(artworkSrc)})` }}
          aria-hidden="true"
        />
      )}
      <div className="game-boot__vignette" aria-hidden="true" />
      <div className="game-boot__particles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            style={
              {
                "--particle-x": `${(index * 29 + 8) % 100}%`,
                "--particle-delay": `${index * -1.3}s`,
                "--particle-duration": `${7 + (index % 5)}s`,
                "--particle-size": `${3 + (index % 4)}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {onClose && (
        <button
          type="button"
          className="game-boot__back"
          onClick={onClose}
          aria-label="Back to lobby"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <div className="game-boot__scene">
        <div className="game-boot__art" data-artwork={artwork}>
          {artwork === "unavailable" ? (
            <div className="game-boot__art-fallback">
              <span>{game.name}</span>
            </div>
          ) : (
            <img
              src={artworkSrc}
              alt={`${game.name} loading illustration`}
              fetchPriority="high"
              decoding="async"
              draggable={false}
            />
          )}
        </div>
      </div>
      <div className="game-boot__console">
        <h1 className="game-boot__name">{game.name}</h1>
        <div className="game-boot__status" role="status" aria-live="polite" aria-atomic="true">
          {error ? (
            <WifiOff size={18} />
          ) : (
            <span className="game-boot__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <span>{status}</span>
        </div>

        {!error && (
          <div
            className="game-boot__progress"
            role="progressbar"
            aria-label={`${game.name} preparation`}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={stage}
            aria-valuetext={status}
          >
            <span style={{ width: `${(stage / 3) * 100}%` }}>
              <i />
            </span>
          </div>
        )}

        {error || slow ? (
          <div className="game-boot__notice">
            <p>
              {error
                ? "Check your connection and reload the page to try again."
                : "We're still opening the game. You can wait here or head back to the lobby."}
            </p>
            <div className="game-boot__actions">
              {error && (
                <button onClick={() => window.location.reload()}>
                  <RotateCw size={14} /> Reload page
                </button>
              )}
              {onClose && <button onClick={onClose}>Back to lobby</button>}
            </div>
          </div>
        ) : null}
        <span className="game-boot__brand" aria-hidden="true">
          MAXHIGH
        </span>
      </div>
    </section>
  );
}
