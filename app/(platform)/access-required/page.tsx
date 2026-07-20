import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type SearchParams = Promise<{
  context?: string;
  next?: string;
}>;

function getSafeNextPath(next?: string) {
  if (!next || !next.startsWith("/")) {
    return "/home";
  }

  return next;
}

function getCopy(context?: string) {
  switch (context) {
    case "prayer":
      return {
        kicker: "Prayer",
        title: "Sign in to pray with the church community",
        body: "Continue with Google to read requests, share your own, and receive follow-up updates.",
      };
    case "community-feed":
      return {
        kicker: "Community Feed",
        title: "Sign in to post with the church community",
        body: "Continue with Google to share updates, photos, and encouragement with the church family.",
      };
    default:
      return {
        kicker: "Member Access",
        title: "Sign in to continue",
        body: "Continue with Google to access member features in the church community.",
      };
  }
}

export default async function AccessRequiredPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const copy = getCopy(params.context);

  return (
    <main className="shell max-w-[560px] py-6">
      <section className="mb-5 rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-6 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
        <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">{copy.kicker}</p>
        <h1 className="mb-3 mt-3 font-sans text-[1.7rem] leading-tight text-foreground">{copy.title}</h1>
        <p className="m-0 text-[1rem] leading-7 text-muted-foreground">{copy.body}</p>
        <div className="mt-5">
          <GoogleSignInButton nextPath={nextPath} />
        </div>
        <div className="mt-4">
          <Link
            className="inline-flex min-h-11 items-center rounded-[16px] border border-border/80 bg-white/80 px-4 text-sm font-semibold text-foreground transition hover:bg-white"
            href={nextPath}
          >
            Go back
          </Link>
        </div>
      </section>
    </main>
  );
}
