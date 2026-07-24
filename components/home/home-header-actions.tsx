"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, Shield } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { createClient } from "@/lib/supabase/client";

const HEADER_AUTH_STORAGE_KEY = "koinonia-header-authenticated";
const HEADER_ADMIN_STORAGE_KEY = "koinonia-header-can-access-admin";

type HomeHeaderActionsProps = {
  initialCanAccessAdmin: boolean;
  initialAuthenticated: boolean;
};

type HeaderState = {
  authenticated: boolean;
  canAccessAdmin: boolean;
};

function readCachedFlag(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(key) === "true";
}

function writeCachedState(nextState: HeaderState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HEADER_AUTH_STORAGE_KEY, String(nextState.authenticated));
  window.localStorage.setItem(HEADER_ADMIN_STORAGE_KEY, String(nextState.canAccessAdmin));
}

function clearCachedState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(HEADER_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(HEADER_ADMIN_STORAGE_KEY);
}

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
  const [state, setState] = useState<HeaderState>(() => {
    const cachedAuthenticated = readCachedFlag(HEADER_AUTH_STORAGE_KEY);
    const cachedCanAccessAdmin = readCachedFlag(HEADER_ADMIN_STORAGE_KEY);

    return {
      authenticated: initialAuthenticated || cachedAuthenticated,
      canAccessAdmin: initialCanAccessAdmin || cachedCanAccessAdmin,
    };
  });

  useEffect(() => {
    const supabase = createClient();

    const syncState = async () => {
      const nextState = await fetchHeaderState();
      setState(nextState);
      writeCachedState(nextState);
    };

    void syncState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const optimisticState = {
          authenticated: true,
          canAccessAdmin: readCachedFlag(HEADER_ADMIN_STORAGE_KEY),
        };
        setState(optimisticState);
        writeCachedState(optimisticState);
        void syncState();
      }

      if (event === "SIGNED_OUT") {
        const signedOutState = {
          authenticated: false,
          canAccessAdmin: false,
        };
        setState(signedOutState);
        clearCachedState();
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
        showLogo={false}
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
