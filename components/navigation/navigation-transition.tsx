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
  showTemporaryLaunch: (targetPath?: string, minimumMs?: number) => void;
};

const NavigationTransitionContext = createContext<NavigationTransitionContextValue | null>(null);

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [transitionState, setTransitionState] = useState<{
    visible: boolean;
    startedAt: number;
    minimumMs: number;
    startPath: string;
    targetPath?: string;
  } | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showTemporaryLaunch = useCallback((targetPath?: string, minimumMs = 350) => {
    setTransitionState({
      visible: true,
      startedAt: Date.now(),
      minimumMs,
      startPath: window.location.pathname,
      targetPath,
    });
  }, []);

  useEffect(() => {
    if (!transitionState?.visible) {
      clearHideTimer();
      return;
    }

    if (pathname === transitionState.startPath) {
      return;
    }

    clearHideTimer();

    const remainingMs = Math.max(
      transitionState.minimumMs - (Date.now() - transitionState.startedAt),
      0,
    );

    hideTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, remainingMs);

    return clearHideTimer;
  }, [clearHideTimer, pathname, transitionState]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const value = useMemo(() => ({ showTemporaryLaunch }), [showTemporaryLaunch]);

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
      {transitionState?.visible ? (
        <div className="fixed inset-0 z-[9998]">
          <AppLaunchScreen variant="themed" />
        </div>
      ) : null}
    </NavigationTransitionContext.Provider>
  );
}

export function useNavigationTransition() {
  return useContext(NavigationTransitionContext);
}
