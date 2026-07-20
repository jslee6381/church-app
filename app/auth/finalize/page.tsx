import { AuthFinalizeClient } from "@/components/auth/auth-finalize-client";

type AuthFinalizePageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

function getSafeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/prayer";
  }

  return value;
}

export default async function AuthFinalizePage({ searchParams }: AuthFinalizePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = getSafeNextPath(resolvedSearchParams?.next);

  return <AuthFinalizeClient nextPath={nextPath} />;
}
