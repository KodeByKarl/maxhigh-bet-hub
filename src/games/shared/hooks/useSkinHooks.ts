import { useLayoutEffect, type RefObject } from "react";
import { motifPattern, motifTileSize } from "@/components/maxhigh/buy-bonus/patterns";
import type { BuyBonusMotifId } from "@/components/maxhigh/buy-bonus/motifs";

/**
 * The shared slot shell renders the reel well and the control deck without styling hooks. This marks them (attributes only, no
 * React-managed props are touched) so the skin stylesheet can reach them:  deck.parentElement = column, column's first child's
 * first child = well. Re-checked on DOM changes because a shell may mount its deck after loading.
 */
export function useSkinHooks(ref: RefObject<HTMLElement | null>, motif: BuyBonusMotifId) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.style.setProperty("--gs-tile", motifPattern(motif, "#ffffff"));
    root.style.setProperty("--gs-tile-size", `${motifTileSize(motif)}px`);
    const tag = () => {
      const deck = root.querySelector<HTMLElement>("[data-slot-deck]");
      const col = deck?.parentElement;
      const first = col?.firstElementChild as HTMLElement | null | undefined;
      const well = first?.firstElementChild as HTMLElement | null | undefined;
      // Payline shells (fire-spike, coin-volcano) keep the deck in a <footer>: the "column" there starts with the deck itself, so there
      // is no template reel well to frame. Never tag the deck, or anything containing it.
      const isTemplateColumn = !!deck && !!first && first !== deck && !first.contains(deck);
      if (col && isTemplateColumn && col.dataset.gsCol == null) col.dataset.gsCol = "";
      if (well && isTemplateColumn && well !== deck && well.dataset.gsWell == null)
        well.dataset.gsWell = "";
    };
    tag();
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tag);
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, [ref, motif]);
}
