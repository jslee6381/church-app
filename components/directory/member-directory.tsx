import { Phone, Mail, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DirectoryMember } from "@/lib/directory";

type Props = {
  members: DirectoryMember[];
};

function formatVisibility(value: "public" | "leaders_only" | "hide_contact") {
  if (value === "public") return "Public";
  if (value === "leaders_only") return "Leaders Only";
  return "Hide Contact";
}

export function MemberDirectory({ members }: Props) {
  return (
    <main className="shell py-8">
      <section className="hero">
        <p className="eyebrow">Member Directory</p>
        <h1>Browse the community in a calm, simple way</h1>
        <p className="hero-copy">
          Contact details follow each member's privacy settings, and internal messaging is not included.
        </p>
      </section>

      <section className="summary-grid">
        <Card className="md:col-span-3">
          <CardHeader>
            <p className="section-kicker">Directory</p>
            <CardTitle>Church member directory</CardTitle>
            <CardDescription>Photos, names, ministries, and roles are arranged to be easy to scan at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {members.length === 0 ? (
              <div className="rounded-[24px] border border-border/80 bg-white/70 p-6">
                <p className="m-0 text-lg leading-8 text-muted-foreground">There are no visible member records yet.</p>
              </div>
            ) : (
              members.map((member) => (
                <article key={member.id} className="rounded-[28px] border border-border/80 bg-white/74 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-center gap-4">
                      {member.photoUrl ? (
                        <img
                          alt={`${member.displayName} profile`}
                          className="size-16 rounded-full object-cover"
                          src={member.photoUrl}
                        />
                      ) : (
                        <div className="inline-flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Users className="size-7" />
                        </div>
                      )}

                      <div>
                        <h2 className="mb-1 text-[1.8rem]">{member.displayName}</h2>
                        <p className="m-0 text-base leading-7 text-muted-foreground">
                          {member.ministry ?? "General Ministry"} · {member.smallGroup ?? "No small group listed"}
                        </p>
                      </div>
                    </div>

                    <div className="sm:ml-auto">
                      <span className="date-chip">{member.role}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[22px] border border-border/70 bg-secondary/48 px-4 py-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-primary">
                        <Phone className="size-4" />
                        Phone
                      </div>
                      <p className="m-0 text-lg leading-7 text-foreground">{member.phone ?? "Hidden"}</p>
                      <p className="m-0 mt-2 text-sm text-muted-foreground">Privacy: {formatVisibility(member.phoneVisibility)}</p>
                    </div>

                    <div className="rounded-[22px] border border-border/70 bg-secondary/48 px-4 py-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-primary">
                        <Mail className="size-4" />
                        Email
                      </div>
                      <p className="m-0 text-lg leading-7 text-foreground">{member.email ?? "Hidden"}</p>
                      <p className="m-0 mt-2 text-sm text-muted-foreground">Privacy: {formatVisibility(member.emailVisibility)}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <p className="section-kicker">Privacy Settings</p>
            <CardTitle>Contact visibility</CardTitle>
            <CardDescription>Each member's contact details are managed using one of the three settings below.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-border/80 bg-white/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <ShieldCheck className="size-4" />
                <span className="text-sm font-semibold uppercase tracking-[0.08em]">Public</span>
              </div>
              <p className="m-0 text-base leading-7 text-muted-foreground">All members can see the contact details.</p>
            </div>
            <div className="rounded-[22px] border border-border/80 bg-white/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <ShieldCheck className="size-4" />
                <span className="text-sm font-semibold uppercase tracking-[0.08em]">Leaders Only</span>
              </div>
              <p className="m-0 text-base leading-7 text-muted-foreground">Only leaders and admins can see the contact details.</p>
            </div>
            <div className="rounded-[22px] border border-border/80 bg-white/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <ShieldCheck className="size-4" />
                <span className="text-sm font-semibold uppercase tracking-[0.08em]">Hide Contact</span>
              </div>
              <p className="m-0 text-base leading-7 text-muted-foreground">Contact details stay hidden, and only profile information is shown.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
