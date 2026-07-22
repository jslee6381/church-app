import { PageHeader } from "@/components/page-header";

export default function StudyPage() {
  return (
    <main className="shell max-w-[560px] py-6">
      <PageHeader title="" />
      <section className="rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] px-4 py-5 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
        <p className="ui-text m-0 text-center text-muted-foreground">No study yet</p>
      </section>
    </main>
  );
}
