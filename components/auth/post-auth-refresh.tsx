"use client";

import { useEffect } from "react";
import { safeSessionStorageGet, safeSessionStorageRemove } from "@/lib/browser-storage";

const POST_AUTH_REFRESH_KEY = "post-auth-refresh-pending";

export function PostAuthRefresh() {
  useEffect(() => {
    if (safeSessionStorageGet(POST_AUTH_REFRESH_KEY) !== "1") {
      return;
    }

    safeSessionStorageRemove(POST_AUTH_REFRESH_KEY);
    window.location.reload();
  }, []);

  return null;
}
