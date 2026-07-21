"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";

type PullToRefreshProps = {
  children: React.ReactNode;
};

const TRIGGER_DISTANCE = 84;
const MAX_PULL_DISTANCE = 120;

export function PullToRefresh({ children }: PullToRefreshProps) {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  function resetPull() {
    startYRef.current = null;
    isPullingRef.current = false;
    setPullDistance(0);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (window.scrollY > 0 || isRefreshing) {
      return;
    }

    startYRef.current = event.touches[0]?.clientY ?? null;
    isPullingRef.current = true;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!isPullingRef.current || startYRef.current === null || isRefreshing) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;

    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    if (window.scrollY > 0) {
      resetPull();
      return;
    }

    setPullDistance(Math.min(delta * 0.45, MAX_PULL_DISTANCE));
  }

  async function handleTouchEnd() {
    if (!isPullingRef.current || isRefreshing) {
      resetPull();
      return;
    }

    const shouldRefresh = pullDistance >= TRIGGER_DISTANCE;
    resetPull();

    if (!shouldRefresh) {
      return;
    }

    setIsRefreshing(true);
    router.refresh();
    window.setTimeout(() => {
      setIsRefreshing(false);
    }, 900);
  }

  const showIndicator = isRefreshing || pullDistance > 0;
  const progress = Math.min(pullDistance / TRIGGER_DISTANCE, 1);

  return (
    <div onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} onTouchStart={handleTouchStart}>
      <div
        aria-hidden="true"
        className="pointer-events-none flex items-center justify-center overflow-hidden text-muted-foreground transition-[height,opacity] duration-200"
        style={{
          height: showIndicator ? 24 + pullDistance * 0.35 : 0,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-2 text-sm"
          style={{
            transform: `scale(${0.9 + progress * 0.1})`,
          }}
        >
          <LoaderCircle className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Refreshing..." : progress >= 1 ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
