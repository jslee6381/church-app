import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getDefaultChurchId } from "@/lib/church-context";
import { formatEventDate, formatEventTime, getEventById } from "@/lib/events";
import { sampleEvents } from "@/lib/data";

export function generateStaticParams() {
  return sampleEvents.map((event) => ({ id: event.id }));
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authSession = await getAuthenticatedMemberSession();
  const { id } = await params;
  const churchId = authSession?.member.church_id ?? (await getDefaultChurchId());
  const event = await getEventById(churchId, id);

  if (!event) {
    notFound();
  }

  return (
    <main className="shell max-w-[560px] py-6">
      <header className="mb-5">
        <Link className="inline-flex items-center gap-2 text-base font-semibold text-foreground" href="/events">
          <ArrowLeft className="size-4" />
          Events
        </Link>
      </header>

      <article className="rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-5 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
        <p className="m-0 font-sans text-[0.95rem] font-semibold text-primary">
          {event.category ?? "Worship Service"}
          <span aria-hidden="true" className="mx-2 inline-block h-3 w-px bg-primary/30 align-middle" />
          {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
        </p>
        <h1 className="mb-3 mt-3 font-sans text-[1.6rem] leading-tight text-foreground">{event.title}</h1>
        <p className="m-0 text-[1rem] leading-7 text-muted-foreground">{event.description}</p>

        {event.posterSrc || event.imageUrl ? (
          <img alt={event.posterAlt ?? event.title} className="mt-4 block w-full rounded-[14px] border border-border/50" src={event.posterSrc ?? event.imageUrl ?? ""} />
        ) : null}

        {event.variant === "service-pair" && event.services ? (
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-[14px] border border-border/70 bg-white/80 p-4 text-center">
            {event.services.map((service) => (
              <div key={service.title} className="space-y-1">
                <p className="m-0 font-sans text-[1.12rem] font-semibold text-foreground">{service.title}</p>
                <p className="m-0 text-[0.98rem] text-muted-foreground">{service.time}</p>
              </div>
            ))}
          </div>
        ) : null}

        {event.locationName ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-4 py-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary" />
            <span>{event.locationName}</span>
          </div>
        ) : null}

        {event.isLiveStream && event.liveStreamUrl ? (
          <div className="mt-4">
            <Button asChild size="sm">
              <Link href={event.liveStreamUrl} rel="noreferrer" target="_blank">
                Live Stream
              </Link>
            </Button>
          </div>
        ) : null}
      </article>

      <div className="mt-5">
        <Button asChild size="sm" variant="secondary">
          <Link href="/home">Back to Home</Link>
        </Button>
      </div>
    </main>
  );
}
