import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";

export default async function ChatPage() {
  const session = await getAuthenticatedMemberSession();

  if (!session) {
    redirect("/access-required?context=chat&next=%2Fchat");
  }

  if (session.member.status !== "active") {
    redirect("/access-required?mode=pending&context=chat&next=%2Fchat");
  }

  return (
    <main className="shell max-w-[560px] py-6">
      <PageHeader title="Chat" />
      <section className="pt-6">
        <p className="ui-text m-0 text-center text-muted-foreground">Chat is currently under development.</p>
      </section>
    </main>
  );
}
