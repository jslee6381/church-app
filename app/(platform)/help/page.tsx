import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMemberSession } from "@/lib/auth/session";

export default async function HelpPage() {
  await requireMemberSession();

  return (
    <main className="shell py-8">
      <Card>
        <CardHeader>
          <p className="section-kicker">Need Help</p>
          <CardTitle>Help request page coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-8 text-muted-foreground">The care and support request flow will be connected here in the next step.</p>
        </CardContent>
      </Card>
    </main>
  );
}
