"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.replace("/home");
    } catch {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="inline-flex min-h-11 items-center justify-center rounded-[16px] px-4 text-sm font-semibold text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Signing out...
      </div>
    );
  }

  return (
    <Button className="min-h-11 rounded-[16px] px-4 text-sm" disabled={isLoading} onClick={handleClick} size="sm" type="button" variant="secondary">
      Sign out
    </Button>
  );
}
