"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MemberItem = {
  id: string;
  displayName: string;
  status: string;
  roleName: "admin" | "leader" | "member";
};

type Props = {
  initialMembers: MemberItem[];
  canAssignRoles: boolean;
};

export function MemberRoleManager({ initialMembers, canAssignRoles }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

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

      setMembers((current) => current.map((member) => (member.id === memberId ? { ...member, roleName } : member)));
      setFeedback("Member role updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update member role.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="section-kicker">Members</p>
        <CardTitle>Member list and roles</CardTitle>
        <CardDescription>{canAssignRoles ? "Admins can assign admin, leader, or member access here." : "Leaders can view roles, but only admins can change them."}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-[22px] border border-border/80 bg-white/72 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="m-0 text-lg font-semibold text-foreground">{member.displayName}</p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">Status: {member.status}</p>
              </div>
              {canAssignRoles ? (
                <div className="flex items-center gap-2">
                  <select
                    className="min-h-11 rounded-[14px] border border-input bg-white px-3"
                    defaultValue={member.roleName}
                    disabled={savingId === member.id}
                    onChange={(event) => updateRole(member.id, event.target.value as MemberItem["roleName"])}
                  >
                    <option value="admin">Admin</option>
                    <option value="leader">Leader</option>
                    <option value="member">Member</option>
                  </select>
                  {savingId === member.id ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
                </div>
              ) : (
                <span className="date-chip">{member.roleName}</span>
              )}
            </div>
          </div>
        ))}
        {feedback ? <p className="m-0 text-sm text-muted-foreground">{feedback}</p> : null}
      </CardContent>
    </Card>
  );
}
