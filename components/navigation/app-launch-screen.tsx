"use client";

import Image from "next/image";
import ubfIcon from "@/ubf-icon.png";

export function AppLaunchScreen() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[30rem] flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 animate-pulse items-center justify-center overflow-hidden rounded-full bg-primary/10">
            <Image alt="Koinonia icon" className="h-full w-full object-cover" placeholder="empty" priority src={ubfIcon} />
          </div>
          <p className="m-0 text-base font-semibold tracking-[0.08em] text-foreground">KOINONIA</p>
          <p className="m-0 text-sm text-muted-foreground">Opening your church community...</p>
        </div>
      </div>
    </main>
  );
}
