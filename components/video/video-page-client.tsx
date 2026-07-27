"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  FileText,
  LoaderCircle,
  MoreVertical,
  Plus,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { BIBLE_BOOKS, formatPassageRange, getBibleBook } from "@/lib/bible";
import { getCurrentEasternDateValue } from "@/lib/eastern-time";
import type { BibleVerse } from "@/lib/bible";

type VideoPostItem = {
  id: string;
  title: string;
  body: string | null;
  scheduledAt: string;
  messengerName: string;
  passageBook: string;
  passageStartChapter: number;
  passageStartVerse: number;
  passageEndChapter: number;
  passageEndVerse: number;
  passageVerses: BibleVerse[] | null;
  videoLink: string | null;
  thumbnailUrl: string | null;
  watchUrl: string | null;
  questionDocUrl: string | null;
  questionDocName: string | null;
  manuscriptDocUrl: string | null;
  manuscriptDocName: string | null;
  createdAt: string | null;
};

type Props = {
  initialPosts: VideoPostItem[];
  canCompose: boolean;
};

type BibleChapterResponse = {
  verseCount?: number;
  error?: string;
};

const DEFAULT_BOOK = "Genesis";
const MULTI_DOCUMENT_REQUEST_LIMIT_BYTES = 4 * 1024 * 1024;

function formatMaterialDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function comparePassagePoints(
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number,
) {
  if (startChapter !== endChapter) {
    return startChapter - endChapter;
  }

  return startVerse - endVerse;
}

function getPassageReference(item: {
  passageBook: string;
  passageStartChapter: number;
  passageStartVerse: number;
  passageEndChapter: number;
  passageEndVerse: number;
}) {
  return formatPassageRange(
    item.passageBook,
    item.passageStartChapter,
    item.passageStartVerse,
    item.passageEndChapter,
    item.passageEndVerse,
  );
}

function getDocumentViewerHref(postId: string, kind: "Question" | "Message Manuscript", reference?: string) {
  const params = new URLSearchParams({
    id: postId,
    kind,
  });

  if (reference) {
    params.set("reference", reference);
  }

  return `/video/document?${params.toString()}`;
}

async function readApiPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const rawText = await response.text();
  const normalizedText = rawText.trim();

  if (normalizedText.includes("Request Entity Too Large")) {
    throw new Error("The attached documents are too large to upload together, so please try saving again.");
  }

  throw new Error(normalizedText || "Unable to save material.");
}

async function fetchVerseCount(book: string, chapter: number) {
  const response = await fetch(`/api/bible/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}`, {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("Unable to load verses.");
  }

  const payload = (await response.json()) as BibleChapterResponse;
  return payload.verseCount ?? 0;
}

export function VideoPageClient({ initialPosts, canCompose }: Props) {
  const router = useRouter();
  const today = useMemo(() => getCurrentEasternDateValue(), []);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const menuAreaRef = useRef<HTMLDivElement | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => getCurrentEasternDateValue());
  const [messengerName, setMessengerName] = useState("");
  const [passageBook, setPassageBook] = useState(DEFAULT_BOOK);
  const [passageStartChapter, setPassageStartChapter] = useState(1);
  const [passageStartVerse, setPassageStartVerse] = useState(1);
  const [passageEndChapter, setPassageEndChapter] = useState(1);
  const [passageEndVerse, setPassageEndVerse] = useState(1);
  const [videoLink, setVideoLink] = useState("");
  const [questionDocument, setQuestionDocument] = useState<File | null>(null);
  const [manuscriptDocument, setManuscriptDocument] = useState<File | null>(null);
  const [existingQuestionDocName, setExistingQuestionDocName] = useState<string | null>(null);
  const [existingManuscriptDocName, setExistingManuscriptDocName] = useState<string | null>(null);
  const [removeQuestionDocument, setRemoveQuestionDocument] = useState(false);
  const [removeManuscriptDocument, setRemoveManuscriptDocument] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startVerseCount, setStartVerseCount] = useState(0);
  const [endVerseCount, setEndVerseCount] = useState(0);
  const [isLoadingStartVerses, setIsLoadingStartVerses] = useState(false);
  const [isLoadingEndVerses, setIsLoadingEndVerses] = useState(false);

  const selectedBook = useMemo(() => getBibleBook(passageBook) ?? getBibleBook(DEFAULT_BOOK), [passageBook]);
  const chapterOptions = useMemo(
    () => Array.from({ length: selectedBook?.chapterCount ?? 1 }, (_, index) => index + 1),
    [selectedBook],
  );
  const startVerseOptions = useMemo(
    () => Array.from({ length: Math.max(startVerseCount, 1) }, (_, index) => index + 1),
    [startVerseCount],
  );
  const endVerseOptions = useMemo(
    () => Array.from({ length: Math.max(endVerseCount, 1) }, (_, index) => index + 1),
    [endVerseCount],
  );

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    if (!isComposerOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isComposerOpen]);

  useEffect(() => {
    if (!openMenuPostId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuAreaRef.current?.contains(event.target as Node)) {
        setOpenMenuPostId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuPostId]);

  useEffect(() => {
    let isCancelled = false;

    const loadStartVerses = async () => {
      setIsLoadingStartVerses(true);

      try {
        const count = await fetchVerseCount(passageBook, passageStartChapter);

        if (!isCancelled) {
          setStartVerseCount(count);
          setPassageStartVerse((current) => Math.min(Math.max(current, 1), Math.max(count, 1)));
        }
      } catch {
        if (!isCancelled) {
          setStartVerseCount(1);
          setPassageStartVerse(1);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingStartVerses(false);
        }
      }
    };

    void loadStartVerses();

    return () => {
      isCancelled = true;
    };
  }, [passageBook, passageStartChapter]);

  useEffect(() => {
    let isCancelled = false;

    const loadEndVerses = async () => {
      setIsLoadingEndVerses(true);

      try {
        const count = await fetchVerseCount(passageBook, passageEndChapter);

        if (!isCancelled) {
          setEndVerseCount(count);
          setPassageEndVerse((current) => Math.min(Math.max(current, 1), Math.max(count, 1)));
        }
      } catch {
        if (!isCancelled) {
          setEndVerseCount(1);
          setPassageEndVerse(1);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingEndVerses(false);
        }
      }
    };

    void loadEndVerses();

    return () => {
      isCancelled = true;
    };
  }, [passageBook, passageEndChapter]);

  useEffect(() => {
    if (passageStartChapter > passageEndChapter) {
      setPassageEndChapter(passageStartChapter);
    }
  }, [passageEndChapter, passageStartChapter]);

  useEffect(() => {
    if (passageStartChapter === passageEndChapter && passageStartVerse > passageEndVerse) {
      setPassageEndVerse(passageStartVerse);
    }
  }, [passageEndChapter, passageEndVerse, passageStartChapter, passageStartVerse]);

  const upcomingPosts = useMemo(
    () =>
      [...posts]
        .filter((item) => item.scheduledAt > today)
        .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt)),
    [posts, today],
  );
  const pastPosts = useMemo(
    () =>
      [...posts]
        .filter((item) => item.scheduledAt <= today)
        .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt)),
    [posts, today],
  );

  function resetForm() {
    setScheduledAt(today);
    setMessengerName("");
    setPassageBook(DEFAULT_BOOK);
    setPassageStartChapter(1);
    setPassageStartVerse(1);
    setPassageEndChapter(1);
    setPassageEndVerse(1);
    setVideoLink("");
    setQuestionDocument(null);
    setManuscriptDocument(null);
    setExistingQuestionDocName(null);
    setExistingManuscriptDocName(null);
    setRemoveQuestionDocument(false);
    setRemoveManuscriptDocument(false);
    setEditingId(null);
    setErrorMessage(null);
    setIsComposerOpen(false);
  }

  function startCreate() {
    resetForm();
    setIsComposerOpen(true);
  }

  function startEditing(item: VideoPostItem) {
    setEditingId(item.id);
    setScheduledAt(item.scheduledAt);
    setMessengerName(item.messengerName);
    setPassageBook(item.passageBook);
    setPassageStartChapter(item.passageStartChapter);
    setPassageStartVerse(item.passageStartVerse);
    setPassageEndChapter(item.passageEndChapter);
    setPassageEndVerse(item.passageEndVerse);
    setVideoLink(item.videoLink ?? "");
    setQuestionDocument(null);
    setManuscriptDocument(null);
    setExistingQuestionDocName(item.questionDocName);
    setExistingManuscriptDocName(item.manuscriptDocName);
    setRemoveQuestionDocument(false);
    setRemoveManuscriptDocument(false);
    setErrorMessage(null);
    setOpenMenuPostId(null);
    setIsComposerOpen(true);
  }

  function buildMaterialFormData(options?: {
    questionDocument?: File | null;
    manuscriptDocument?: File | null;
  }) {
    const formData = new FormData();
    formData.set("scheduledAt", scheduledAt);
    formData.set("messengerName", messengerName.trim());
    formData.set("passageBook", passageBook);
    formData.set("passageStartChapter", String(passageStartChapter));
    formData.set("passageStartVerse", String(passageStartVerse));
    formData.set("passageEndChapter", String(passageEndChapter));
    formData.set("passageEndVerse", String(passageEndVerse));
    formData.set("videoLink", videoLink.trim());

    if (options?.questionDocument) {
      formData.set("questionDocument", options.questionDocument);
    }

    if (options?.manuscriptDocument) {
      formData.set("manuscriptDocument", options.manuscriptDocument);
    }

    if (removeQuestionDocument && !(options?.questionDocument instanceof File)) {
      formData.set("removeQuestionDocument", "true");
    }

    if (removeManuscriptDocument && !(options?.manuscriptDocument instanceof File)) {
      formData.set("removeManuscriptDocument", "true");
    }

    return formData;
  }

  async function submitMaterialRequest(method: "POST" | "PATCH", formData: FormData, postId?: string) {
    const response = await fetch(postId ? `/api/videos/${postId}` : "/api/videos", {
      method,
      body: formData,
    });
    const payload = await readApiPayload(response);

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to save material.");
    }

    return payload;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!messengerName.trim()) {
      setErrorMessage("Please complete the messenger field.");
      return;
    }

    if (comparePassagePoints(passageStartChapter, passageStartVerse, passageEndChapter, passageEndVerse) > 0) {
      setErrorMessage("Please keep the passage end after the start.");
      return;
    }

    setIsSaving(true);

    try {
      const totalNewDocumentSize = (questionDocument?.size ?? 0) + (manuscriptDocument?.size ?? 0);
      const shouldSplitUploads =
        Boolean(questionDocument) &&
        Boolean(manuscriptDocument) &&
        totalNewDocumentSize > MULTI_DOCUMENT_REQUEST_LIMIT_BYTES;

      let payload;

      if (shouldSplitUploads) {
        const firstPayload = await submitMaterialRequest(
          editingId ? "PATCH" : "POST",
          buildMaterialFormData({ questionDocument }),
          editingId ?? undefined,
        );
        const postId = editingId ?? firstPayload.post.id;

        payload = await submitMaterialRequest(
          "PATCH",
          buildMaterialFormData({ manuscriptDocument }),
          postId,
        );
      } else {
        payload = await submitMaterialRequest(
          editingId ? "PATCH" : "POST",
          buildMaterialFormData({ questionDocument, manuscriptDocument }),
          editingId ?? undefined,
        );
      }

      const nextPost: VideoPostItem = {
        id: payload.post.id,
        title: payload.post.title,
        body: payload.post.body ?? null,
        scheduledAt: payload.post.scheduled_at,
        messengerName: payload.post.messenger_name,
        passageBook: payload.post.passage_book,
        passageStartChapter: payload.post.passage_start_chapter,
        passageStartVerse: payload.post.passage_start_verse,
        passageEndChapter: payload.post.passage_end_chapter,
        passageEndVerse: payload.post.passage_end_verse,
        passageVerses: payload.post.passage_verses ?? null,
        videoLink: payload.post.video_link ?? null,
        thumbnailUrl: payload.post.thumbnail_url ?? null,
        watchUrl: payload.post.watch_url ?? null,
        questionDocUrl: payload.post.question_doc_url ?? null,
        questionDocName: payload.post.question_doc_name ?? null,
        manuscriptDocUrl: payload.post.manuscript_doc_url ?? null,
        manuscriptDocName: payload.post.manuscript_doc_name ?? null,
        createdAt: payload.post.created_at ?? null,
      };

      if (editingId) {
        setPosts((current) => current.map((item) => (item.id === editingId ? nextPost : item)));
      } else {
        setPosts((current) => [nextPost, ...current]);
      }

      resetForm();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save material.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePost(postId: string) {
    setDeletingId(postId);

    try {
      const response = await fetch(`/api/videos/${postId}`, {
        method: "DELETE",
      });
      const payload = await readApiPayload(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete material.");
      }

      setPosts((current) => current.filter((item) => item.id !== postId));
      if (editingId === postId) {
        resetForm();
      }
      setOpenMenuPostId(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const currentPassageReference = getPassageReference({
    passageBook,
    passageStartChapter,
    passageStartVerse,
    passageEndChapter,
    passageEndVerse,
  });

  return (
    <section className="space-y-5">
      {canCompose ? (
        <div
          ref={composerRef}
          className="event-form-surface rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
        >
          <div className="flex items-center justify-center">
            <button
              aria-label={isComposerOpen ? "Close material form" : "Create material post"}
              className="event-form-input inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-white text-foreground"
              onClick={() => (isComposerOpen ? resetForm() : startCreate())}
              type="button"
            >
              <Plus className={`size-5 transition-transform ${isComposerOpen ? "rotate-45" : ""}`} />
            </button>
          </div>

          {isComposerOpen ? (
            <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="ui-text text-sm font-semibold text-foreground">Post Date</span>
                  <input
                    className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                    onChange={(event) => setScheduledAt(event.target.value)}
                    type="date"
                    value={scheduledAt}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="ui-text text-sm font-semibold text-foreground">Messenger</span>
                  <input
                    className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                    onChange={(event) => setMessengerName(event.target.value)}
                    placeholder="Messenger name"
                    value={messengerName}
                  />
                </label>
              </div>

                <label className="grid gap-2">
                  <span className="ui-text text-sm font-semibold text-foreground">Passage Book</span>
                  <select
                    className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                    onChange={(event) => {
                      setPassageBook(event.target.value);
                      setPassageStartChapter(1);
                      setPassageStartVerse(1);
                      setPassageEndChapter(1);
                      setPassageEndVerse(1);
                    }}
                    value={passageBook}
                  >
                    <optgroup label="Old Testament">
                      {BIBLE_BOOKS.filter((item) => item.testament === "OT").map((item) => (
                        <option key={item.book} value={item.book}>
                          {item.book}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="New Testament">
                      {BIBLE_BOOKS.filter((item) => item.testament === "NT").map((item) => (
                        <option key={item.book} value={item.book}>
                          {item.book}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-3">
                    <span className="ui-text text-sm font-semibold text-foreground">Start</span>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                        onChange={(event) => setPassageStartChapter(Number(event.target.value))}
                        value={passageStartChapter}
                      >
                        {chapterOptions.map((chapter) => (
                          <option key={`start-chapter-${chapter}`} value={chapter}>
                            Chapter {chapter}
                          </option>
                        ))}
                      </select>
                      <select
                        className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                        disabled={isLoadingStartVerses}
                        onChange={(event) => setPassageStartVerse(Number(event.target.value))}
                        value={passageStartVerse}
                      >
                        {startVerseOptions.map((verse) => (
                          <option key={`start-verse-${verse}`} value={verse}>
                            {isLoadingStartVerses ? "Loading..." : `Verse ${verse}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <span className="ui-text text-sm font-semibold text-foreground">End</span>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                        onChange={(event) => setPassageEndChapter(Number(event.target.value))}
                        value={passageEndChapter}
                      >
                        {chapterOptions.map((chapter) => (
                          <option key={`end-chapter-${chapter}`} value={chapter}>
                            Chapter {chapter}
                          </option>
                        ))}
                      </select>
                      <select
                        className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                        disabled={isLoadingEndVerses}
                        onChange={(event) => setPassageEndVerse(Number(event.target.value))}
                        value={passageEndVerse}
                      >
                        {endVerseOptions.map((verse) => (
                          <option key={`end-verse-${verse}`} value={verse}>
                            {isLoadingEndVerses ? "Loading..." : `Verse ${verse}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

              <label className="grid gap-2">
                <span className="ui-text text-sm font-semibold text-foreground">Message YouTube Link</span>
                <input
                  className="event-form-input ui-text min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                  onChange={(event) => setVideoLink(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  type="url"
                  value={videoLink}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="ui-text text-sm font-semibold text-foreground">Bible Question DOCX</span>
                  <div className="event-form-input rounded-[16px] border border-dashed border-border/80 bg-white px-4 py-4">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm text-muted-foreground">
                      <div className="flex min-w-0 items-center gap-2">
                        <Upload className="size-4" />
                        <span className="block min-w-0 truncate">
                          {removeQuestionDocument ? "No document selected" : questionDocument?.name ?? existingQuestionDocName ?? "Upload a DOCX file"}
                        </span>
                      </div>
                      {(questionDocument || (existingQuestionDocName && !removeQuestionDocument)) ? (
                        <button
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border/80 text-foreground"
                          onClick={(event) => {
                            event.preventDefault();
                            if (questionDocument) {
                              setQuestionDocument(null);
                              setRemoveQuestionDocument(false);
                              return;
                            }

                            setRemoveQuestionDocument(true);
                          }}
                          type="button"
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                    <input
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="mt-3 block w-full text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:font-semibold file:text-primary"
                      onChange={(event) => {
                        setQuestionDocument(event.target.files?.[0] ?? null);
                        setRemoveQuestionDocument(false);
                      }}
                      type="file"
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="ui-text text-sm font-semibold text-foreground">Message Manuscript DOCX</span>
                  <div className="event-form-input rounded-[16px] border border-dashed border-border/80 bg-white px-4 py-4">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm text-muted-foreground">
                      <div className="flex min-w-0 items-center gap-2">
                        <Upload className="size-4" />
                        <span className="block min-w-0 truncate">
                          {removeManuscriptDocument ? "No document selected" : manuscriptDocument?.name ?? existingManuscriptDocName ?? "Upload a DOCX file"}
                        </span>
                      </div>
                      {(manuscriptDocument || (existingManuscriptDocName && !removeManuscriptDocument)) ? (
                        <button
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border/80 text-foreground"
                          onClick={(event) => {
                            event.preventDefault();
                            if (manuscriptDocument) {
                              setManuscriptDocument(null);
                              setRemoveManuscriptDocument(false);
                              return;
                            }

                            setRemoveManuscriptDocument(true);
                          }}
                          type="button"
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                    <input
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="mt-3 block w-full text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:font-semibold file:text-primary"
                      onChange={(event) => {
                        setManuscriptDocument(event.target.files?.[0] ?? null);
                        setRemoveManuscriptDocument(false);
                      }}
                      type="file"
                    />
                  </div>
                </label>
              </div>

              {errorMessage ? (
                <p className="ui-text m-0 rounded-[14px] border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="event-form-input inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 text-base font-semibold text-foreground"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : editingId ? "Save" : "Post"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-5">
        <MaterialSection canCompose={canCompose} deletingId={deletingId} items={upcomingPosts} onDelete={deletePost} onEdit={startEditing} onOpenMenu={setOpenMenuPostId} openMenuPostId={openMenuPostId} menuAreaRef={menuAreaRef} title="Upcoming Bible Study" />
        <MaterialSection canCompose={canCompose} deletingId={deletingId} items={pastPosts} onDelete={deletePost} onEdit={startEditing} onOpenMenu={setOpenMenuPostId} openMenuPostId={openMenuPostId} menuAreaRef={menuAreaRef} title="Past Bible Study" />

        {upcomingPosts.length === 0 && pastPosts.length === 0 ? (
          <article className="material-card-surface rounded-[18px] border border-border/80 px-4 py-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
            <p className="ui-text m-0 text-center text-muted-foreground">No materials yet</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function MaterialSection({
  title,
  items,
  canCompose,
  openMenuPostId,
  deletingId,
  menuAreaRef,
  onOpenMenu,
  onEdit,
  onDelete,
}: {
  title: string;
  items: VideoPostItem[];
  canCompose: boolean;
  openMenuPostId: string | null;
  deletingId: string | null;
  menuAreaRef: RefObject<HTMLDivElement | null>;
  onOpenMenu: Dispatch<SetStateAction<string | null>>;
  onEdit: (item: VideoPostItem) => void;
  onDelete: (postId: string) => Promise<void>;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="px-1">
        <p className="ui-text m-0 text-left text-foreground">{title}</p>
      </div>

      {items.map((item) => {
        const passageReference = getPassageReference(item);
        const actionCount = Number(Boolean(item.questionDocUrl)) + Number(Boolean(item.manuscriptDocUrl));

        return (
          <article
            className="material-card-surface relative overflow-hidden rounded-[18px] border border-border/80 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
            key={item.id}
          >
            {canCompose ? (
              <div ref={openMenuPostId === item.id ? menuAreaRef : null} className="absolute right-3 top-3 z-20">
                <div className="relative">
                  <button
                    aria-label="Material post actions"
                    className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                    onClick={() => onOpenMenu((current) => (current === item.id ? null : item.id))}
                    type="button"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {openMenuPostId === item.id ? (
                    <div
                      className="menu-surface absolute right-0 top-[calc(100%+0.25rem)] z-30 min-w-[148px] overflow-hidden rounded-[14px] border border-border shadow-[0_10px_24px_rgba(68,52,35,0.08)]"
                    >
                      <button
                        className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                        onClick={() => onEdit(item)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                        disabled={deletingId === item.id}
                        onClick={() => void onDelete(item.id)}
                        type="button"
                      >
                        {deletingId === item.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="event-form-input inline-flex items-center gap-2 rounded-full border border-input bg-white px-3 py-1 text-xs font-semibold text-foreground">
                  <CalendarDays className="size-3.5" />
                  {formatMaterialDate(item.scheduledAt)}
                </span>
                <span className="event-form-input inline-flex items-center gap-2 rounded-full border border-input bg-white px-3 py-1 text-xs font-semibold text-foreground">
                  <UserRound className="size-3.5" />
                  {item.messengerName}
                </span>
              </div>

              <div className="mt-4 pl-1">
                <p className="ui-text m-0 text-sm font-semibold leading-6 text-foreground">{passageReference}</p>
              </div>

              {item.watchUrl && item.thumbnailUrl ? (
                <a
                  className="material-frame-surface mt-4 block overflow-hidden rounded-[16px] border border-border/70"
                  href={item.watchUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="relative overflow-hidden bg-background">
                    <img alt={item.title} className="block aspect-video w-full object-cover" src={item.thumbnailUrl} />
                    <span className="event-form-input absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-input bg-white px-3 py-1 text-xs font-semibold text-foreground">
                      <ExternalLink className="size-3.5" />
                      YouTube
                    </span>
                  </div>
                </a>
              ) : null}

              {actionCount > 0 ? (
                <div className={`mt-4 grid gap-2 ${actionCount > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {item.questionDocUrl ? (
                    <Link
                      className="material-action-button flex min-h-[52px] items-center justify-center gap-1.5 rounded-[16px] border border-primary bg-primary px-3 py-2 text-center"
                      href={getDocumentViewerHref(item.id, "Question", passageReference)}
                    >
                      <FileText className="size-4 shrink-0" />
                      <span className="ui-text text-xs font-semibold leading-4">Question</span>
                    </Link>
                  ) : null}

                  {item.manuscriptDocUrl ? (
                    <Link
                      className="material-action-button flex min-h-[52px] items-center justify-center gap-1.5 rounded-[16px] border border-primary bg-primary px-3 py-2 text-center"
                      href={getDocumentViewerHref(item.id, "Message Manuscript")}
                    >
                      <FileText className="size-4 shrink-0" />
                      <span className="ui-text text-xs font-semibold leading-4">Manuscript</span>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
