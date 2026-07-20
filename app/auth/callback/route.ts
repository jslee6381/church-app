import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

type ResponseCookieInput = {
  name: string;
  value: string;
  options?: Parameters<typeof NextResponse.prototype.cookies.set>[2];
};

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/prayer";
  }

  return value;
}

function getAppOrigin(requestUrl: URL) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (requestUrl.hostname === "0.0.0.0") {
    requestUrl.hostname = "localhost";
    return requestUrl.origin;
  }

  return requestUrl.origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = getSafeNextPath(url.searchParams.get("next"));
  const nextUrl = new URL(
    `/auth/finalize?next=${encodeURIComponent(nextPath)}`,
    getAppOrigin(url),
  );
  const response = NextResponse.redirect(nextUrl);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return response.cookies.getAll().length > 0
              ? response.cookies.getAll()
              : request.headers.get("cookie")
                ?.split(/;\s*/)
                .filter(Boolean)
                .map((cookie) => {
                  const [name, ...rest] = cookie.split("=");
                  return {
                    name,
                    value: rest.join("="),
                  };
                }) ?? [];
          },
          setAll(cookiesToSet: ResponseCookieInput[]) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
