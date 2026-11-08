"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_PAGE_TIMING === "1";

/**
 * Logs page switches to the browser console:
 *   [nav] / → /plan 1450ms
 * measured from the click on a link to the new page being on screen.
 * On under `next dev`; set NEXT_PUBLIC_PAGE_TIMING=1 at build time for production.
 * AUDIT: only times navigations that start with a click on an <a> (every app
 * nav link is one). Back/forward buttons and router.push() aren't timed.
 */
export function NavTiming() {
  const pathname = usePathname();
  const pending = useRef<{ from: string; to: string; start: number } | null>(null);

  useEffect(() => {
    if (!ENABLED) return;
    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.origin !== location.origin) return;
      if (link.pathname === location.pathname) return;
      pending.current = { from: location.pathname, to: link.pathname, start: performance.now() };
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const nav = pending.current;
    if (!ENABLED || !nav || nav.to !== pathname) return;
    pending.current = null;
    // Wait for the browser to paint the new page before stopping the clock.
    requestAnimationFrame(() => {
      console.log(`[nav] ${nav.from} → ${nav.to} ${Math.round(performance.now() - nav.start)}ms`);
    });
  }, [pathname]);

  return null;
}
