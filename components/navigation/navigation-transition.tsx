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
import { AppLaunchScreen } from "@/components/navigation/app-launch-screen";

type NavigationTransitionContextValue = {
  showTemporaryLaunch: (durationMs?: number) => void;
};

const NavigationTransitionContext = createContext<NavigationTransitionContextValue | null>(null);

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearLaunchTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showTemporaryLaunch = useCallback((durationMs = 260) => {
    clearLaunchTimeout();
    setIsVisible(true);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      timeoutRef.current = null;
    }, durationMs);
  }, [clearLaunchTimeout]);

  useEffect(() => {
    return () => {
      clearLaunchTimeout();
    };
  }, [clearLaunchTimeout]);

  const value = useMemo(() => ({ showTemporaryLaunch }), [showTemporaryLaunch]);

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
      {isVisible ? (
        <div className="fixed inset-0 z-[120]">
          <AppLaunchScreen />
        </div>
      ) : null}
    </NavigationTransitionContext.Provider>
  );
}

export function useNavigationTransition() {
  return useContext(NavigationTransitionContext);
}
