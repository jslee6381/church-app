"use client";

import { useEffect, useState } from "react";
import { AppLaunchScreen } from "@/components/navigation/app-launch-screen";

const MIN_INITIAL_LAUNCH_MS = 800;

export function InitialLaunchGate() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, MIN_INITIAL_LAUNCH_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      <AppLaunchScreen variant="initial" />
    </div>
  );
}
