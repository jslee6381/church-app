"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, QrCode, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMBER_LOCAL_STORAGE_KEY } from "@/lib/auth/constants";
import { safeLocalStorageSet } from "@/lib/browser-storage";

type ValidationState = {
  churchName: string;
  issuedForName: string | null;
  code: string;
};

export function InvitationFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCode = useMemo(() => searchParams.get("code") ?? "", [searchParams]);
  const [code, setCode] = useState(prefilledCode);
  const [displayName, setDisplayName] = useState("");
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleValidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsValidating(true);

    try {
      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Invitation code could not be verified.");
      }

      setValidation(payload);
      setDisplayName(payload.issuedForName ?? "");
    } catch (validationError) {
      setValidation(null);
      setError(validationError instanceof Error ? validationError.message : "Unable to verify invitation.");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/invitations/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: validation.code,
          displayName,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "We could not start your church session.");
      }

      safeLocalStorageSet(
        MEMBER_LOCAL_STORAGE_KEY,
        JSON.stringify({
          memberId: payload.member.id,
          churchId: payload.member.churchId,
          displayName: payload.member.displayName,
          rememberedAt: new Date().toISOString(),
        }),
      );

      router.replace("/home");
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Unable to join the church community.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell flex min-h-screen items-center py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="hero fade-up">
          <p className="eyebrow">Invitation only</p>
          <h1>Join the church community in the simplest way</h1>
          <p className="hero-copy">
            Scan an invitation QR code or enter an invitation code to go straight into the church home without creating an account.
          </p>
          <div className="summary-grid !grid-cols-1 md:!grid-cols-2">
            <article className="summary-card fade-up fade-up-delay-1">
              <p className="section-kicker">Step 1</p>
              <h2 className="text-[1.75rem]">Scan a QR code or enter a code</h2>
              <p>You only need an invitation from the church. There is no long signup process.</p>
            </article>
            <article className="summary-card fade-up fade-up-delay-2">
              <p className="section-kicker">Step 2</p>
              <h2 className="text-[1.75rem]">Enter your name and continue</h2>
              <p>We save a lightweight member session on this device so it opens easily next time.</p>
            </article>
          </div>
        </section>

        <Card className="fade-up self-center">
          <CardHeader className="gap-3">
            <div className="inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
              {validation ? <UserRound className="size-6" /> : <QrCode className="size-6" />}
            </div>
            <CardTitle>{validation ? "Enter your display name" : "Verify invitation"}</CardTitle>
            <CardDescription>
              {validation
                ? `Before entering ${validation.churchName ?? "the church"} home, we only need your name.`
                : "Enter the invitation code you received or opened from a QR link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!validation ? (
              <form className="grid gap-4" onSubmit={handleValidate}>
                <label className="grid gap-2 text-base font-semibold text-foreground">
                  Invitation code
                  <input
                    autoComplete="one-time-code"
                    className="min-h-14 rounded-[24px] border border-input bg-white/90 px-5 text-lg outline-none ring-0 transition focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                    inputMode="text"
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="e.g. GRACE-2026"
                    value={code}
                  />
                </label>
                <Button disabled={isValidating || code.trim().length === 0} size="lg" type="submit">
                  {isValidating ? <LoaderCircle className="animate-spin" /> : null}
                  Verify invitation
                </Button>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={handleClaim}>
                <div className="rounded-[22px] border border-border bg-secondary px-5 py-4 text-base text-secondary-foreground">
                  <p className="m-0 font-semibold">{validation.churchName}</p>
                  <p className="m-0 mt-1 text-muted-foreground">Your invitation code has been verified.</p>
                </div>
                <label className="grid gap-2 text-base font-semibold text-foreground">
                  Display name
                  <input
                    autoComplete="name"
                    className="min-h-14 rounded-[24px] border border-input bg-white/90 px-5 text-lg outline-none ring-0 transition focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="e.g. Grace Kim"
                    value={displayName}
                  />
                </label>
                <Button disabled={isSubmitting || displayName.trim().length < 2} size="lg" type="submit">
                  {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
                  Enter church home
                </Button>
                <Button
                  onClick={() => {
                    setValidation(null);
                    setError(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Enter a different code
                </Button>
              </form>
            )}

            {error ? <p className="mt-4 text-base font-medium text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
