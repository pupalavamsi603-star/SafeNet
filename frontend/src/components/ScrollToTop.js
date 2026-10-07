import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * SPA navigation keeps the previous scroll position, so moving from deep in a
 * long page to a new route used to land mid-page. Reset on every path change,
 * but leave hash links (#section) alone so in-page anchors still work.
 */
export function ScrollToTop() {
  const { pathname, hash, search } = useLocation();
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  const view = params.get("view");

  useEffect(() => {
    if (hash) {
      const scroll = () => {
        const target = document.getElementById(hash.slice(1));
        if (!target) return false;
        target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        return true;
      };
      if (scroll()) return;
      // Lazy routes may still show their loading state when navigation occurs.
      const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
      observer.observe(document.getElementById("main-content"), { childList: true, subtree: true });
      const timeout = setTimeout(() => observer.disconnect(), 5000);
      return () => { observer.disconnect(); clearTimeout(timeout); };
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname, hash, tab, view]);

  return null;
}
