"use client";

import { useState } from "react";
import Image from "next/image";
import { LoaderCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InvitationResult = {
  code: string;
  expiresAtLabel: string;
  qrDataUrl: string;
  inviteUrl: string;
  maxUsage: number;
};

export function InvitationGenerator() {
  const [issuedForName, setIssuedForName] = useState("");
  const [maxUsage, setMaxUsage] = useState("1");
  const [expiresInDays, setExpiresInDays] = useState("14");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/invitation-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issuedForName,
          maxUsage: Number(maxUsage),
          expiresInDays: Number(expiresInDays),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate invitation.");
      }

      setResult(payload);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to generate invitation.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="section-kicker">Invitation Tokens</p>
        <CardTitle>Generate invitation QR codes</CardTitle>
        <CardDescription>Create invitation codes and show them immediately as scannable QR codes.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form className="grid gap-4" onSubmit={handleGenerate}>
          <label className="grid gap-2 text-base font-semibold text-foreground">
            Issued for
            <input
              className="min-h-12 rounded-[18px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
              onChange={(event) => setIssuedForName(event.target.value)}
              placeholder="Optional member or family name"
              value={issuedForName}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-base font-semibold text-foreground">
              Max usage
              <input
                className="min-h-12 rounded-[18px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                inputMode="numeric"
                onChange={(event) => setMaxUsage(event.target.value)}
                value={maxUsage}
              />
            </label>

            <label className="grid gap-2 text-base font-semibold text-foreground">
              Expires in days
              <input
                className="min-h-12 rounded-[18px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                inputMode="numeric"
                onChange={(event) => setExpiresInDays(event.target.value)}
                value={expiresInDays}
              />
            </label>
          </div>

          <Button disabled={isGenerating} size="lg" type="submit">
            {isGenerating ? <LoaderCircle className="animate-spin" /> : <QrCode className="size-5" />}
            Generate QR code
          </Button>
        </form>

        {error ? <p className="m-0 text-base text-destructive">{error}</p> : null}

        {result ? (
          <div className="grid gap-4 rounded-[24px] border border-border/80 bg-white/72 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="overflow-hidden rounded-[24px] border border-border bg-white p-3">
                <Image alt="Invitation QR code" height={180} src={result.qrDataUrl} width={180} />
              </div>
              <div className="grid gap-2">
                <p className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-primary">Invitation Code</p>
                <p className="m-0 text-3xl font-semibold tracking-[0.04em] text-foreground">{result.code}</p>
                <p className="m-0 text-base leading-7 text-muted-foreground">Expires {result.expiresAtLabel} · Max usage {result.maxUsage}</p>
                <p className="m-0 break-all text-sm leading-6 text-muted-foreground">{result.inviteUrl}</p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
