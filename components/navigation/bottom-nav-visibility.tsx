"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type BottomNavVisibilityContextValue = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

const BottomNavVisibilityContext = createContext<BottomNavVisibilityContextValue | null>(null);

export function BottomNavVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const value = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <BottomNavVisibilityContext.Provider value={value}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

export function useBottomNavVisibility() {
  return useContext(BottomNavVisibilityContext);
}
