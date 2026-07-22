"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function LiveRouteRefresh() {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  function refreshIfNeeded() {
    const now = Date.now();

    if (now - lastRefreshAtRef.current < 4000) {
      return;
    }

    lastRefreshAtRef.current = now;
    router.refresh();
  }

  useEffect(() => {
    function handleFocus() {
      refreshIfNeeded();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshIfNeeded();
      }
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
