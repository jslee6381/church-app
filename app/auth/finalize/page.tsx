"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

const POST_AUTH_REFRESH_KEY = "post-auth-refresh-pending";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/home";
  }

  return value;
}

export default function AuthFinalizePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = getSafeNextPath(searchParams.get("next"));
    window.sessionStorage.setItem(POST_AUTH_REFRESH_KEY, "1");
    window.location.replace(nextPath);
  }, [searchParams]);

  return (
    <main className="shell flex min-h-[60vh] items-center justify-center py-10">
      <div className="rounded-[18px] border border-border/80 bg-white/88 px-6 py-8 text-center shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
        <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-4 mb-0 text-base text-muted-foreground">Finishing sign in...</p>
      </div>
    </main>
  );
}
