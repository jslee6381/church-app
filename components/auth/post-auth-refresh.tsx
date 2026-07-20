"use client";

import { useEffect } from "react";

const POST_AUTH_REFRESH_KEY = "post-auth-refresh-pending";

export function PostAuthRefresh() {
  useEffect(() => {
    if (window.sessionStorage.getItem(POST_AUTH_REFRESH_KEY) !== "1") {
      return;
    }

    window.sessionStorage.removeItem(POST_AUTH_REFRESH_KEY);
    window.location.reload();
  }, []);

  return null;
}
