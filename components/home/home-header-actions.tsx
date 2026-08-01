"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getEasternGreeting } from "@/lib/eastern-time";
import { createClient } from "@/lib/supabase/client";

const HEADER_AUTH_STORAGE_KEY = "koinonia-header-authenticated";
const HEADER_ADMIN_STORAGE_KEY = "koinonia-header-can-access-admin";

type HomeHeaderActionsProps = {
  initialCanAccessAdmin: boolean;
  initialAuthenticated: boolean;
  initialDisplayName?: string | null;
  initialProfilePhotoUrl?: string | null;
};

type HeaderState = {
  authenticated: boolean;
  canAccessAdmin: boolean;
  displayName: string | null;
  profilePhotoUrl: string | null;
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
      displayName: null,
      profilePhotoUrl: null,
    };
  }

  const data = (await response.json()) as {
    authenticated?: boolean;
    canAccessAdmin?: boolean;
    profilePhotoUrl?: string | null;
    member?: {
      display_name?: string | null;
      full_name?: string | null;
    };
  };

  return {
    authenticated: data.authenticated === true,
    canAccessAdmin: data.canAccessAdmin === true,
    displayName: data.member?.display_name ?? data.member?.full_name ?? null,
    profilePhotoUrl: data.profilePhotoUrl ?? null,
  };
}

export function HomeHeaderActions({
  initialAuthenticated,
  initialCanAccessAdmin,
  initialDisplayName = null,
  initialProfilePhotoUrl = null,
}: HomeHeaderActionsProps) {
  const [state, setState] = useState<HeaderState>(() => {
    const cachedAuthenticated = readCachedFlag(HEADER_AUTH_STORAGE_KEY);
    const cachedCanAccessAdmin = readCachedFlag(HEADER_ADMIN_STORAGE_KEY);

    return {
      authenticated: initialAuthenticated || cachedAuthenticated,
      canAccessAdmin: initialCanAccessAdmin || cachedCanAccessAdmin,
      displayName: initialDisplayName,
      profilePhotoUrl: initialProfilePhotoUrl,
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
          displayName: state.displayName,
          profilePhotoUrl: state.profilePhotoUrl,
        };
        setState(optimisticState);
        writeCachedState(optimisticState);
        void syncState();
      }

      if (event === "SIGNED_OUT") {
        const signedOutState = {
          authenticated: false,
          canAccessAdmin: false,
          displayName: null,
          profilePhotoUrl: null,
        };
        setState(signedOutState);
        clearCachedState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (state.authenticated) {
    return (
      <div className="flex items-center gap-3">
        {state.profilePhotoUrl ? (
          <img
            alt={`${state.displayName ?? "Member"} profile`}
            className="size-10 rounded-full object-cover"
            src={state.profilePhotoUrl}
          />
        ) : (
          <div className="inline-flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Users className="size-5" />
          </div>
        )}
        <div className="text-left">
          <p className="ui-text m-0 font-semibold text-foreground">
            {getEasternGreeting()}, {state.displayName ?? "Member"}
          </p>
        </div>
      </div>
    );
  }

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
