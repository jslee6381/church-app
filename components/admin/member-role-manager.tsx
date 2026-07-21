"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

type MemberItem = {
  id: string;
  displayName: string;
  email: string | null;
  isProtected: boolean;
  status: string;
  roleName: "admin" | "leader" | "member";
};

type Props = {
  initialMembers: MemberItem[];
  canAssignRoles: boolean;
  canDeleteMembers: boolean;
  onStatusChange?: (memberId: string, status: string) => void;
  onRoleChange?: (memberId: string, roleName: MemberItem["roleName"]) => void;
  onDelete?: (memberId: string) => void;
};

export function MemberRoleManager({
  initialMembers,
  canAssignRoles,
  canDeleteMembers,
  onStatusChange,
  onRoleChange,
  onDelete,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  async function updateStatus(memberId: string, status: "invited") {
    setSavingId(memberId);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update member status.");
      }

      setMembers((current) =>
        current.map((member) => (member.id === memberId ? { ...member, status } : member)),
      );
      onStatusChange?.(memberId, status);
      setFeedback("Member status updated.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update member status.");
    } finally {
      setSavingId(null);
    }
  }

  async function updateRole(memberId: string, roleName: MemberItem["roleName"]) {
    setSavingId(memberId);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/members/${memberId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleName }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update member role.");
      }

      setMembers((current) =>
        current.map((member) => (member.id === memberId ? { ...member, roleName, status: "active" } : member)),
      );
      onRoleChange?.(memberId, roleName);
      setFeedback("Member role updated.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update member role.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteMember(memberId: string) {
    setSavingId(memberId);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete member.");
      }

      setMembers((current) => current.filter((member) => member.id !== memberId));
      onDelete?.(memberId);
      setConfirmDeleteId(null);
      setFeedback("Member deleted.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete member.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="border-t border-border/70 pt-4">
      <div>
        <p className="section-kicker">Members</p>
      </div>
      <div className="mt-4 grid gap-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-[22px] border border-border/80 bg-white/72 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="m-0 text-lg font-semibold text-foreground">{member.displayName}</p>
                {member.email ? <p className="m-0 mt-1 text-sm text-muted-foreground">{member.email}</p> : null}
                <p className="m-0 mt-1 text-sm text-muted-foreground">Status: {member.status === "invited" ? "pending" : member.status}</p>
              </div>
              {canAssignRoles ? (
                <div className="grid w-[7.5rem] gap-2">
                  <select
                    className="h-10 w-full rounded-[12px] border border-input bg-white px-2.5 py-0 text-sm leading-none"
                    value={member.status === "invited" ? "pending" : member.roleName}
                    disabled={savingId === member.id || member.isProtected}
                    onChange={(event) => {
                      const nextValue = event.target.value;

                      if (nextValue === "pending") {
                        void updateStatus(member.id, "invited");
                        return;
                      }

                      void updateRole(member.id, nextValue as MemberItem["roleName"]);
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="leader">Leader</option>
                    <option value="member">Member</option>
                    <option value="pending">Pending</option>
                  </select>
                  {canDeleteMembers && !member.isProtected ? (
                    confirmDeleteId === member.id ? (
                      <div className="grid gap-2">
                        <p className="m-0 text-center text-sm font-semibold text-foreground">Are you sure?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className="inline-flex h-10 w-full items-center justify-center rounded-[12px] border border-input bg-white px-2.5 py-0 text-sm font-semibold leading-none text-foreground disabled:opacity-60"
                            disabled={savingId === member.id}
                            onClick={() => setConfirmDeleteId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="inline-flex h-10 w-full items-center justify-center rounded-[12px] bg-[#d80000] px-2.5 py-0 text-sm font-semibold leading-none text-white disabled:opacity-60"
                            disabled={savingId === member.id}
                            onClick={() => deleteMember(member.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="inline-flex h-10 w-full items-center justify-center rounded-[12px] bg-[#d80000] px-2.5 py-0 text-sm font-semibold leading-none text-white disabled:opacity-60"
                        disabled={savingId === member.id}
                        onClick={() => setConfirmDeleteId(member.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    )
                  ) : null}
                  {savingId === member.id ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
                </div>
              ) : (
                <span className="date-chip">{member.roleName}</span>
              )}
            </div>
            {member.isProtected ? <p className="m-0 mt-2 text-sm text-muted-foreground">Protected admin account</p> : null}
          </div>
        ))}
        {feedback ? <p className="m-0 text-sm text-muted-foreground">{feedback}</p> : null}
      </div>
    </section>
  );
}
