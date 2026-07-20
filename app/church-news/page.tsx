import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { socialPosts } from "@/lib/data";

export default function ChurchNewsPage() {
  return (
    <main className="shell">
      <PageHeader
        title="Church News"
        description="A simple card view for community highlights, event photos, and recent church moments."
      />

      <section className="news-grid">
        {socialPosts.map((post) => (
          <article className="news-card" key={post.id}>
            <div className="news-image" aria-hidden="true">
              <span>{post.imageLabel}</span>
            </div>
            <div className="news-copy">
              <span className="date-chip">{post.date}</span>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
              <Link className="text-link" href={post.link}>
                View on Instagram
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
