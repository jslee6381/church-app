"use client";

import { useState } from "react";

type AnnouncementDraft = {
  title: string;
  date: string;
  summary: string;
  body: string;
  isPinned: boolean;
};

type PrayerDraft = {
  title: string;
  date: string;
  body: string;
};

type StudyDraft = {
  title: string;
  scripture: string;
  date: string;
  questionOne: string;
  questionTwo: string;
  questionThree: string;
};

const initialAnnouncement: AnnouncementDraft = {
  title: "Sunday Fellowship Lunch",
  date: "2026.06.07",
  summary: "Join us for lunch together in the fellowship hall after worship.",
  body: "First-time guests are warmly welcome. If you need assistance, please speak with the hospitality team.",
  isPinned: true,
};

const initialPrayer: PrayerDraft = {
  title: "Healing for members who are unwell",
  date: "2026.06.07",
  body: "Please pray for recovery, strength, and peace for those receiving treatment and for their families.",
};

const initialStudy: StudyDraft = {
  title: "This Week's Bible Study Questions",
  scripture: "Philippians 4:4-7",
  date: "2026.06.07",
  questionOne: "Why does Paul encourage believers to rejoice?",
  questionTwo: "What does turning anxiety into prayer look like in daily life?",
  questionThree: "What does it mean for God's peace to guard our hearts and minds?",
};

export function ContentManager() {
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [prayer, setPrayer] = useState(initialPrayer);
  const [study, setStudy] = useState(initialStudy);

  return (
    <section className="admin-layout">
      <div className="stack">
        <article className="list-card">
          <p className="section-kicker">Announcement Draft</p>
          <div className="form-grid">
            <label>
              Title
              <input
                value={announcement.title}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              Date
              <input
                value={announcement.date}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Summary
              <textarea
                rows={3}
                value={announcement.summary}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, summary: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Full Message
              <textarea
                rows={4}
                value={announcement.body}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, body: event.target.value }))
                }
              />
            </label>
            <label className="check-row full-width">
              <input
                type="checkbox"
                checked={announcement.isPinned}
                onChange={(event) =>
                  setAnnouncement((current) => ({ ...current, isPinned: event.target.checked }))
                }
              />
              Pin this item to the top
            </label>
          </div>
        </article>

        <article className="list-card">
          <p className="section-kicker">Prayer Draft</p>
          <div className="form-grid">
            <label>
              Title
              <input
                value={prayer.title}
                onChange={(event) =>
                  setPrayer((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              Date
              <input
                value={prayer.date}
                onChange={(event) =>
                  setPrayer((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Request
              <textarea
                rows={4}
                value={prayer.body}
                onChange={(event) =>
                  setPrayer((current) => ({ ...current, body: event.target.value }))
                }
              />
            </label>
          </div>
        </article>

        <article className="list-card">
          <p className="section-kicker">Bible Study Draft</p>
          <div className="form-grid">
            <label>
              Title
              <input
                value={study.title}
                onChange={(event) =>
                  setStudy((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              Scripture
              <input
                value={study.scripture}
                onChange={(event) =>
                  setStudy((current) => ({ ...current, scripture: event.target.value }))
                }
              />
            </label>
            <label>
              Date
              <input
                value={study.date}
                onChange={(event) =>
                  setStudy((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Question 1
              <textarea
                rows={2}
                value={study.questionOne}
                onChange={(event) =>
                  setStudy((current) => ({ ...current, questionOne: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Question 2
              <textarea
                rows={2}
                value={study.questionTwo}
                onChange={(event) =>
                  setStudy((current) => ({ ...current, questionTwo: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Question 3
              <textarea
                rows={2}
                value={study.questionThree}
                onChange={(event) =>
                  setStudy((current) => ({ ...current, questionThree: event.target.value }))
                }
              />
            </label>
          </div>
        </article>
      </div>

      <aside className="preview-panel">
        <article className="summary-card">
          <p className="section-kicker">Announcement Preview</p>
          {announcement.isPinned ? <span className="pill">Pinned</span> : null}
          <h2>{announcement.title}</h2>
          <span className="date-chip">{announcement.date}</span>
          <p>{announcement.summary}</p>
          <div className="notice-body">{announcement.body}</div>
        </article>

        <article className="summary-card">
          <p className="section-kicker">Prayer Preview</p>
          <h2>{prayer.title}</h2>
          <span className="date-chip">{prayer.date}</span>
          <p>{prayer.body}</p>
        </article>

        <article className="summary-card">
          <p className="section-kicker">Bible Study Preview</p>
          <h2>{study.title}</h2>
          <p>{study.scripture}</p>
          <span className="date-chip">{study.date}</span>
          <ol className="question-list">
            <li>{study.questionOne}</li>
            <li>{study.questionTwo}</li>
            <li>{study.questionThree}</li>
          </ol>
        </article>
      </aside>
    </section>
  );
}
