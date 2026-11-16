import { useEffect } from "react";

const FIELD = "input, textarea, select, [contenteditable='true']";
const NON_TEXT = new Set(["checkbox", "radio", "range", "button", "submit", "color", "file"]);

/**
 * Keeps focused form fields visible when a phone/tablet on-screen keyboard opens.
 *
 * Android Chrome resizes the layout viewport (interactive-widget=resizes-content); iOS Safari does not, it only shrinks the
 * *visual* viewport, which leaves centred dialogs half behind the keyboard. This publishes the visual viewport as CSS
 * variables (--vv-h, --vv-top, --kb) plus html[data-kb-open], which styles.css uses to re-fit dialogs, and scrolls the
 * focused field into view. Pinch-zoom is never touched. A no-op on desktop (no keyboard inset is ever reported).
 */
export function ViewportKeyboardSync() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    let raf = 0;

    const sync = () => {
      raf = 0;
      if (!vv) return;
      // Ignore the shrink caused by pinch-zoom: only a genuine height loss at scale ~1 is a keyboard.
      const kb =
        vv.scale <= 1.02
          ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
          : 0;
      root.style.setProperty("--vv-h", `${Math.round(vv.height)}px`);
      root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);
      root.style.setProperty("--kb", `${kb}px`);
      if (kb > 80) root.setAttribute("data-kb-open", "true");
      else root.removeAttribute("data-kb-open");
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.matches?.(FIELD)) return;
      if (t instanceof HTMLInputElement && NON_TEXT.has(t.type)) return;
      // Wait for the keyboard animation, then bring the field into the middle of what is left.
      window.setTimeout(() => {
        if (document.activeElement === t) t.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 320);
    };

    sync();
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("orientationchange", schedule);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("orientationchange", schedule);
      document.removeEventListener("focusin", onFocusIn);
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-kb-open");
    };
  }, []);
  return null;
}
