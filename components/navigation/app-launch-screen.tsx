"use client";

export function AppLaunchScreen() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[30rem] flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-pulse rounded-full bg-primary/20" />
          <p className="m-0 text-base font-semibold tracking-[0.08em] text-foreground">KOINONIA</p>
          <p className="m-0 text-sm text-muted-foreground">Opening your church community...</p>
        </div>
      </div>
    </main>
  );
}
