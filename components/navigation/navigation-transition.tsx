"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type NavigationTransitionContextValue = {
  showTemporaryLaunch: (durationMs?: number) => void;
};

const NavigationTransitionContext = createContext<NavigationTransitionContextValue | null>(null);

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const showTemporaryLaunch = useCallback(() => {}, []);
  const value = useMemo(() => ({ showTemporaryLaunch }), [showTemporaryLaunch]);

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
    </NavigationTransitionContext.Provider>
  );
}

export function useNavigationTransition() {
  return useContext(NavigationTransitionContext);
}
