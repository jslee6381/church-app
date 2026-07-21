"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type PendingMemberItem = {
  id: string;
  displayName: string;
  email: string | null;
  createdAtLabel: string;
  status: string;
};

type Props = {
  initialMembers: PendingMemberItem[];
};

export function PendingMembersApproval({ initialMembers }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  async function approveMember(memberId: string) {
    setSavingId(memberId);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "active",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to approve member.");
      }

      setMembers((current) => current.filter((member) => member.id !== memberId));
      setFeedback("Member approved.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to approve member.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="border-t border-border/70 pt-4">
      <div>
        <p className="section-kicker">Pending Members</p>
      </div>
      <div className="mt-4 grid gap-3">
        {members.length === 0 ? (
          <p className="m-0 text-base leading-7 text-muted-foreground">No members are waiting for approval right now.</p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="rounded-[22px] border border-border/80 bg-white/72 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-lg font-semibold text-foreground">{member.displayName}</p>
                  {member.email ? <p className="m-0 mt-1 text-sm text-muted-foreground">{member.email}</p> : null}
                  <p className="m-0 mt-1 text-sm text-muted-foreground">Signed in {member.createdAtLabel}</p>
                </div>
                <Button
                  className="min-h-10 rounded-[16px]"
                  disabled={savingId === member.id}
                  onClick={() => approveMember(member.id)}
                  size="sm"
                  type="button"
                >
                  {savingId === member.id ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Approve
                </Button>
              </div>
            </div>
          ))
        )}
        {feedback ? <p className="m-0 text-sm text-muted-foreground">{feedback}</p> : null}
      </div>
    </section>
  );
}
