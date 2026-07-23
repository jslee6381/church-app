"use client";

import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type GoogleSignInButtonProps = {
  nextPath?: string;
  label?: string;
  compact?: boolean;
  variant?: "default" | "secondary" | "ghost";
  className?: string;
  iconOnly?: boolean;
  showLogo?: boolean;
};

function GoogleLogoIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M21.805 12.23c0-.68-.061-1.334-.174-1.964H12v3.717h5.498a4.704 4.704 0 0 1-2.04 3.088v2.564h3.303c1.933-1.78 3.044-4.407 3.044-7.405Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.075-.915 6.761-2.469l-3.303-2.564c-.915.614-2.086.977-3.458.977-2.654 0-4.904-1.792-5.707-4.2H2.878v2.645A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.293 13.744A5.996 5.996 0 0 1 5.974 12c0-.606.109-1.194.319-1.744V7.61H2.878A10 10 0 0 0 2 12c0 1.61.385 3.135 1.078 4.39l3.215-2.646Z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.955c1.5 0 2.846.516 3.907 1.53l2.93-2.93C17.07 2.91 14.755 2 12 2A10 10 0 0 0 3.078 7.61l3.215 2.646c.803-2.408 3.053-4.3 5.707-4.3Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  nextPath = "/prayer",
  label = "Continue with Google",
  compact = false,
  variant = "default",
  className,
  iconOnly = false,
  showLogo = true,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to start Google sign in.");
    }
  }

  return (
    <div className={compact ? "grid gap-2" : "grid gap-3"}>
      <Button
        className={cn(
          compact ? "min-h-11 rounded-[16px] px-4 text-sm" : "min-h-12 rounded-[18px]",
          iconOnly
            ? "google-sign-in-button border bg-transparent shadow-none hover:bg-transparent"
            : "google-sign-in-button border bg-transparent shadow-none hover:bg-transparent",
          className,
        )}
        disabled={isLoading}
        onClick={handleClick}
        size="sm"
        type="button"
        variant={variant}
      >
        {isLoading ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : iconOnly ? (
          <LogIn className="size-4" />
        ) : showLogo ? (
          <GoogleLogoIcon className="size-[1.05rem] shrink-0" />
        ) : null}
        {iconOnly ? <span className="sr-only">{label}</span> : label}
      </Button>
      {errorMessage ? <p className="m-0 text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
