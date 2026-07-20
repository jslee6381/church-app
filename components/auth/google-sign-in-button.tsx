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
};

export function GoogleSignInButton({
  nextPath = "/prayer",
  label = "Continue with Google",
  compact = false,
  variant = "default",
  className,
  iconOnly = false,
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
        className={cn(compact ? "min-h-11 rounded-[16px] px-4 text-sm" : "min-h-12 rounded-[18px]", className)}
        disabled={isLoading}
        onClick={handleClick}
        size="sm"
        type="button"
        variant={variant}
      >
        {isLoading ? <LoaderCircle className="size-5 animate-spin" /> : iconOnly ? <LogIn className="size-4" /> : null}
        {iconOnly ? <span className="sr-only">{label}</span> : label}
      </Button>
      {errorMessage ? <p className="m-0 text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
