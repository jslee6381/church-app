import { PageHeader } from "@/components/page-header";
import { prayerTopics } from "@/lib/data";

export default function PrayerTopicsPage() {
  return (
    <main className="shell">
      <PageHeader
        title="Prayer Topics"
        description="A sample page for sharing public prayer needs that are appropriate for the wider church community."
      />

      <section className="stack">
        {prayerTopics.map((item) => (
          <article className="list-card" key={item.id}>
            <div className="list-card-header">
              <h2>{item.title}</h2>
              <span className="date-chip">{item.date}</span>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
