import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * SPA navigation keeps the previous scroll position, so moving from deep in a
 * long page to a new route used to land mid-page. Reset on every path change,
 * but leave hash links (#section) alone so in-page anchors still work.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname, hash]);

  return null;
}
