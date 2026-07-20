import { MemberDirectory } from "@/components/directory/member-directory";
import { getDirectoryContext } from "@/lib/directory";
import { requireMemberSession } from "@/lib/auth/session";

export default async function DirectoryPage() {
  const session = await requireMemberSession();
  const members = await getDirectoryContext(session.member.id, session.member.church_id);

  return <MemberDirectory members={members} />;
}
