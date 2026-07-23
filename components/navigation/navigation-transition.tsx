"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AppLaunchScreen } from "@/components/navigation/app-launch-screen";

type NavigationTransitionContextValue = {
  showTemporaryLaunch: (durationMs?: number) => void;
};

const NavigationTransitionContext = createContext<NavigationTransitionContextValue | null>(null);
const MIN_ROUTE_OVERLAY_MS = 260;
const MAX_ROUTE_OVERLAY_MS = 1600;

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [visible, setVisible] = useState(false);
  const modeRef = useRef<"idle" | "route" | "temporary">("idle");
  const startedAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const failSafeTimerRef = useRef<number | null>(null);
  const locationKeyRef = useRef("");

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (failSafeTimerRef.current !== null) {
      window.clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }
  }, []);

  const hideOverlay = useCallback(() => {
    clearTimers();
    modeRef.current = "idle";
    setVisible(false);
  }, [clearTimers]);

  const startRouteOverlay = useCallback(() => {
    clearTimers();
    startedAtRef.current = Date.now();
    modeRef.current = "route";
    setVisible(true);
    failSafeTimerRef.current = window.setTimeout(() => {
      hideOverlay();
    }, MAX_ROUTE_OVERLAY_MS);
  }, [clearTimers, hideOverlay]);

  const showTemporaryLaunch = useCallback((durationMs = 220) => {
    clearTimers();
    modeRef.current = "temporary";
    setVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      hideOverlay();
    }, durationMs);
  }, [clearTimers, hideOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHash = () => {
      setHash(window.location.hash);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextLocationKey = `${pathname}${window.location.search}#${hash}`;
    const previousLocationKey = locationKeyRef.current;
    locationKeyRef.current = nextLocationKey;

    if (!previousLocationKey || previousLocationKey === nextLocationKey || modeRef.current !== "route") {
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_ROUTE_OVERLAY_MS - elapsed);

    hideTimerRef.current = window.setTimeout(() => {
      hideOverlay();
    }, remaining);
  }, [hash, hideOverlay, pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      const current = window.location;
      if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash) {
        return;
      }

      startRouteOverlay();
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [startRouteOverlay]);

  useEffect(() => () => {
    clearTimers();
  }, [clearTimers]);

  const value = useMemo(() => ({ showTemporaryLaunch }), [showTemporaryLaunch]);

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
      {visible ? (
        <div className="fixed inset-0 z-[120] bg-background">
          <AppLaunchScreen />
        </div>
      ) : null}
    </NavigationTransitionContext.Provider>
  );
}

export function useNavigationTransition() {
  return useContext(NavigationTransitionContext);
}
