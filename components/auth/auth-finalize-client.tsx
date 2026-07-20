"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";

const POST_AUTH_REFRESH_KEY = "post-auth-refresh-pending";

type Props = {
  nextPath: string;
};

export function AuthFinalizeClient({ nextPath }: Props) {
  useEffect(() => {
    window.sessionStorage.setItem(POST_AUTH_REFRESH_KEY, "1");
    window.location.replace(nextPath);
  }, [nextPath]);

  return (
    <main className="shell flex min-h-[60vh] items-center justify-center py-10">
      <div className="rounded-[18px] border border-border/80 bg-white/88 px-6 py-8 text-center shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
        <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-4 mb-0 text-base text-muted-foreground">Finishing sign in...</p>
      </div>
    </main>
  );
}
