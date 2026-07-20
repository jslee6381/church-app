import { PageHeader } from "@/components/page-header";
import { bibleStudyPosts } from "@/lib/data";

export default function BibleStudyPage() {
  return (
    <main className="shell">
      <PageHeader
        title="Bible Study"
        description="Review the passage and discussion questions ahead of time so everyone can come prepared."
      />

      <section className="stack">
        {bibleStudyPosts.map((post) => (
          <article className="list-card" key={post.id}>
            <div className="list-card-header">
              <div>
                <h2>{post.title}</h2>
                <p className="muted-line">{post.scripture}</p>
              </div>
              <span className="date-chip">{post.date}</span>
            </div>
            <ol className="question-list">
              {post.questions.map((question, index) => (
                <li key={question}>
                  <strong>{index + 1}.</strong> {question}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
    </main>
  );
}
