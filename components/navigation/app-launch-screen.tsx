"use client";

import Image from "next/image";

type AppLaunchScreenProps = {
  variant?: "themed" | "initial";
};

export function AppLaunchScreen({ variant = "themed" }: AppLaunchScreenProps) {
  if (variant === "initial") {
    return (
      <main className="initial-launch-screen flex h-full min-h-0 w-full items-center justify-center px-4">
        <div className="mx-auto flex w-full max-w-[42rem] items-center justify-center">
          <div className="w-full">
            <Image
              alt="New York UBF logo"
              className="block h-auto w-full"
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
