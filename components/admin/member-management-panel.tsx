"use client";

import { useState } from "react";
import { MemberRoleManager } from "@/components/admin/member-role-manager";
import { PendingMembersApproval } from "@/components/admin/pending-members-approval";
import type { AdminPendingMemberItem } from "@/lib/admin/dashboard";

type MemberManagementItem = {
  id: string;
  displayName: string;
  email: string | null;
  isProtected: boolean;
  status: string;
  roleName: "admin" | "leader" | "member";
};

type Props = {
  initialPendingMembers: AdminPendingMemberItem[];
  initialMembers: MemberManagementItem[];
  canAssignRoles: boolean;
  canDeleteMembers: boolean;
};

export function MemberManagementPanel({
  initialPendingMembers,
  initialMembers,
  canAssignRoles,
  canDeleteMembers,
}: Props) {
  const [pendingMembers, setPendingMembers] = useState(initialPendingMembers);
  const [members, setMembers] = useState(initialMembers);

  function handleMemberApproved(memberId: string) {
    const approvedMember = pendingMembers.find((member) => member.id === memberId);

    setPendingMembers((current) => current.filter((member) => member.id !== memberId));

    if (!approvedMember) {
      return;
    }

    setMembers((current) => {
      if (current.some((member) => member.id === memberId)) {
        return current;
      }

      return [
        {
          id: approvedMember.id,
          displayName: approvedMember.displayName,
          email: approvedMember.email,
          isProtected: false,
          status: "active",
          roleName: "member",
        },
        ...current,
      ];
    });
  }

  function handleMemberDeleted(memberId: string) {
    setMembers((current) => current.filter((member) => member.id !== memberId));
    setPendingMembers((current) => current.filter((member) => member.id !== memberId));
  }

  function handleMemberStatusChanged(memberId: string, status: string) {
    if (status === "invited") {
      const existingMember = members.find((member) => member.id === memberId);

      setMembers((current) => current.filter((member) => member.id !== memberId));

      if (existingMember) {
        setPendingMembers((current) => {
          if (current.some((member) => member.id === memberId)) {
            return current;
          }

          return [
            {
              id: existingMember.id,
              displayName: existingMember.displayName,
              email: existingMember.email,
              createdAtLabel: "just now",
              status: "invited",
            },
            ...current,
          ];
        });
      }

      return;
    }

    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, status } : member)),
    );
  }

  function handleMemberRoleChanged(memberId: string, roleName: MemberManagementItem["roleName"]) {
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId
          ? {
              ...member,
              roleName,
              status: "active",
            }
          : member,
      ),
    );
  }

  return (
    <section className="summary-grid">
      <PendingMembersApproval initialMembers={pendingMembers} onApprove={handleMemberApproved} />
      <MemberRoleManager
        canAssignRoles={canAssignRoles}
        canDeleteMembers={canDeleteMembers}
        initialMembers={members}
        onDelete={handleMemberDeleted}
        onRoleChange={handleMemberRoleChanged}
        onStatusChange={handleMemberStatusChanged}
      />
    </section>
  );
}
