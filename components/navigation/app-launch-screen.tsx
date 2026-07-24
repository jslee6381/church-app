"use client";

import Image from "next/image";

export function AppLaunchScreen() {
  return (
    <main className="launch-screen flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="mx-auto flex w-full max-w-[42rem] items-center justify-center">
        <div className="w-full">
          <Image
            alt="New York UBF logo"
            className="launch-logo-light block h-auto w-full"
            height={385}
            placeholder="empty"
            priority
            src="/ubf-logo-transparent.png"
            width={1814}
          />
          <Image
            alt="New York UBF logo"
            className="launch-logo-dark block h-auto w-full"
            height={385}
            placeholder="empty"
            priority
            src="/ubf-logo-white-transparent.png"
            width={1814}
          />
        </div>
      </div>
    </main>
  );
}
