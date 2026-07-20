import { PageHeader } from "@/components/page-header";
import { announcements } from "@/lib/data";

export default function AnnouncementsPage() {
  return (
    <main className="shell">
      <PageHeader
        title="Announcements"
        description="See worship times, event schedules, and important church updates in one place."
      />

      <section className="stack">
        {announcements.map((item) => (
          <article className="list-card" key={item.id}>
            <div className="list-card-header">
              <div>
                {item.isPinned ? <span className="pill">Pinned</span> : null}
                <h2>{item.title}</h2>
              </div>
              <span className="date-chip">{item.date}</span>
            </div>
            <p>{item.summary}</p>
            <div className="notice-body">{item.body}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
