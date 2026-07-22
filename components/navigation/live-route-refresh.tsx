"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function LiveRouteRefresh() {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);

  function refreshIfNeeded() {
    const now = Date.now();

    if (now - lastRefreshAtRef.current < 30000) {
      return;
    }

    lastRefreshAtRef.current = now;
    router.refresh();
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (hiddenAt && Date.now() - hiddenAt > 45000) {
        refreshIfNeeded();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
