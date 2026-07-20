"use client";

import { useEffect } from "react";
import { MEMBER_LOCAL_STORAGE_KEY } from "@/lib/auth/constants";

type MemberLocalSyncProps = {
  member: {
    id: string;
    churchId: string;
    displayName: string;
  };
};

export function MemberLocalSync({ member }: MemberLocalSyncProps) {
  useEffect(() => {
    window.localStorage.setItem(
      MEMBER_LOCAL_STORAGE_KEY,
      JSON.stringify({
        memberId: member.id,
        churchId: member.churchId,
        displayName: member.displayName,
        rememberedAt: new Date().toISOString(),
      }),
    );
  }, [member]);

  return null;
}
