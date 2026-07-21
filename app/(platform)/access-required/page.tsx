import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
  const areaLabel =
    context === "prayer"
      ? "Prayer"
      : context === "community-feed"
        ? "Community Feed"
        : "Member Access";

  return {
    kicker: areaLabel,
    title: "This feature is for church members",
    body: "",
  };
}

export default async function AccessRequiredPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const copy = getCopy(params.context);

  return (
    <main className="shell max-w-[560px] py-6">
      <header className="mb-5">
        <Link className="inline-flex items-center gap-2 text-base font-semibold text-foreground" href="/home">
          <ChevronLeft className="size-4" />
          Home
        </Link>
      </header>

      <section className="mb-5 mx-auto max-w-[28rem] text-center">
        <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">{copy.kicker}</p>
        <h1 className="ui-text mb-3 mt-3 font-sans font-semibold leading-tight text-foreground">{copy.title}</h1>
        {copy.body ? <p className="ui-text m-0 text-muted-foreground">{copy.body}</p> : null}
        <div className="mt-5">
          <GoogleSignInButton nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
