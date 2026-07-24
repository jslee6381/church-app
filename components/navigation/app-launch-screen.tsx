"use client";

import Image from "next/image";

export function AppLaunchScreen() {
  return (
    <main className="launch-screen min-h-dvh bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[42rem] items-center justify-center">
        <div className="w-full">
          <Image
            alt="New York UBF logo"
            className="launch-logo-light block h-auto w-full"
            placeholder="empty"
            priority
            src="/ubf-logo-transparent.png"
          />
          <Image
            alt="New York UBF logo"
            className="launch-logo-dark block h-auto w-full"
            placeholder="empty"
            priority
            src="/ubf-logo-white-transparent.png"
          />
        </div>
      </div>
    </main>
  );
}
