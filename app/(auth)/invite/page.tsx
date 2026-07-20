import { InvitationFlow } from "@/components/auth/invitation-flow";
import { getMemberSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function InvitePage() {
  const session = await getMemberSession();

  if (session) {
    redirect("/home");
  }

  return <InvitationFlow />;
}
