"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, Shield } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { createClient } from "@/lib/supabase/client";

type HomeHeaderActionsProps = {
  initialCanAccessAdmin: boolean;
  initialAuthenticated: boolean;
};

type HeaderState = {
  authenticated: boolean;
  canAccessAdmin: boolean;
};

async function fetchHeaderState(): Promise<HeaderState> {
  const response = await fetch("/api/member/profile", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      authenticated: false,
      canAccessAdmin: false,
    };
  }

  const data = (await response.json()) as {
    authenticated?: boolean;
    canAccessAdmin?: boolean;
  };

  return {
    authenticated: data.authenticated === true,
    canAccessAdmin: data.canAccessAdmin === true,
  };
}

export function HomeHeaderActions({
  initialAuthenticated,
  initialCanAccessAdmin,
}: HomeHeaderActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<HeaderState>({
    authenticated: initialAuthenticated,
    canAccessAdmin: initialCanAccessAdmin,
  });

  useEffect(() => {
    const supabase = createClient();

    const syncState = async () => {
      const nextState = await fetchHeaderState();
      setState(nextState);
    };

    void syncState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void syncState();
      }

      if (event === "SIGNED_OUT") {
        setState({
          authenticated: false,
          canAccessAdmin: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (!state.authenticated) {
    return (
      <GoogleSignInButton
        className="min-h-9 rounded-[14px] border-0 bg-transparent pr-3 pl-0 text-sm font-semibold shadow-none hover:bg-transparent hover:shadow-none"
        compact
        label="Sign in"
        nextPath="/home"
        variant="secondary"
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      {state.canAccessAdmin ? (
        <Link
          aria-label="Admin"
          className="inline-flex size-11 items-center justify-center rounded-[16px] bg-background text-foreground transition hover:bg-background"
          href="/admin"
          title="Admin"
        >
          <Shield className="size-[1.3rem]" />
        </Link>
      ) : null}
      <Link
        aria-label="Settings"
        className="inline-flex size-11 items-center justify-center rounded-[16px] bg-background text-foreground transition hover:bg-background"
        href="/settings"
        title="Settings"
      >
        <Settings className="size-[1.3rem]" />
      </Link>
    </div>
  );
}
