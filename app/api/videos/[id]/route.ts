import { NextResponse } from "next/server";

import { fetchPassageVerses, getBibleBook, formatPassageRange } from "@/lib/bible";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { extractDocxTextFromFile } from "@/lib/material-documents";
import { removePublicDocument, uploadPublicDocument } from "@/lib/storage";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { getYouTubeThumbnailUrl, getYouTubeWatchUrl } from "@/lib/youtube";

const TITLE_LIMIT = 120;
const MESSENGER_LIMIT = 80;

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const roles = await getMemberRoles(session.member.id);
    const canCompose = roles.includes("admin") || roles.includes("leader");

    if (!canCompose) {
      return NextResponse.json({ error: "Only leaders and admins can edit materials." }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const scheduledAt = String(formData.get("scheduledAt") ?? "").trim();
    const messengerName = normalizeText(String(formData.get("messengerName") ?? ""));
    const passageBook = String(formData.get("passageBook") ?? "").trim();
    const passageStartChapter = parsePositiveInteger(formData.get("passageStartChapter"));
    const passageStartVerse = parsePositiveInteger(formData.get("passageStartVerse"));
    const passageEndChapter = parsePositiveInteger(formData.get("passageEndChapter"));
    const passageEndVerse = parsePositiveInteger(formData.get("passageEndVerse"));
    const videoLink = String(formData.get("videoLink") ?? "").trim();
    const questionDocument = formData.get("questionDocument");
    const manuscriptDocument = formData.get("manuscriptDocument");

    const book = getBibleBook(passageBook);
    const thumbnailUrl = videoLink ? getYouTubeThumbnailUrl(videoLink) : null;
    const watchUrl = videoLink ? getYouTubeWatchUrl(videoLink) : null;

    if (!scheduledAt || Number.isNaN(Date.parse(`${scheduledAt}T00:00:00Z`))) {
      return NextResponse.json({ error: "Please select a valid material date." }, { status: 400 });
    }

    if (!messengerName || !book || !passageStartChapter || !passageStartVerse || !passageEndChapter || !passageEndVerse) {
      return NextResponse.json({ error: "Please complete the messenger and passage fields." }, { status: 400 });
    }

    if (passageStartChapter > book.chapterCount || passageEndChapter > book.chapterCount) {
      return NextResponse.json({ error: "Please select a valid chapter for the chosen Bible book." }, { status: 400 });
    }

    if (comparePassagePoints(passageStartChapter, passageStartVerse, passageEndChapter, passageEndVerse) > 0) {
      return NextResponse.json({ error: "Please keep the passage end after the start." }, { status: 400 });
    }

    if (videoLink && (!thumbnailUrl || !watchUrl)) {
      return NextResponse.json({ error: "Please use a valid YouTube link." }, { status: 400 });
    }

    if (messengerName.length > MESSENGER_LIMIT) {
      return NextResponse.json({ error: `Please keep the messenger name under ${MESSENGER_LIMIT} characters.` }, { status: 400 });
    }

    const title = normalizeText(`${formatPassageRange(passageBook, passageStartChapter, passageStartVerse, passageEndChapter, passageEndVerse)} · ${messengerName}`);
    const passageReference = formatPassageRange(passageBook, passageStartChapter, passageStartVerse, passageEndChapter, passageEndVerse);

    if (title.length > TITLE_LIMIT) {
      return NextResponse.json({ error: `Please keep the generated title under ${TITLE_LIMIT} characters.` }, { status: 400 });
    }

    const passageVerses = await fetchPassageVerses(passageReference);
    const questionDocText =
      questionDocument instanceof File && questionDocument.size > 0
        ? await extractDocxTextFromFile(questionDocument, "Question")
        : null;
    const manuscriptDocText =
      manuscriptDocument instanceof File && manuscriptDocument.size > 0
        ? await extractDocxTextFromFile(manuscriptDocument, "Message Manuscript")
        : null;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        post: {
          id,
          title,
          body: null,
          scheduled_at: scheduledAt,
          messenger_name: messengerName,
          passage_book: passageBook,
          passage_start_chapter: passageStartChapter,
          passage_start_verse: passageStartVerse,
          passage_end_chapter: passageEndChapter,
          passage_end_verse: passageEndVerse,
          passage_verses: passageVerses,
          video_link: videoLink || null,
          thumbnail_url: thumbnailUrl,
          watch_url: watchUrl,
          question_doc_url: null,
          question_doc_name: questionDocument instanceof File && questionDocument.size > 0 ? questionDocument.name : null,
          question_doc_text: questionDocText,
          manuscript_doc_url: null,
          manuscript_doc_name: manuscriptDocument instanceof File && manuscriptDocument.size > 0 ? manuscriptDocument.name : null,
          manuscript_doc_text: manuscriptDocText,
          created_at: new Date().toISOString(),
        },
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("video_posts")
      .select("id, church_id, question_doc_url, manuscript_doc_url, question_doc_name, manuscript_doc_name, question_doc_text, manuscript_doc_text")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Material post not found." }, { status: 404 });
    }

    let nextQuestionDocUrl = existing.question_doc_url ?? null;
    let nextQuestionDocName = existing.question_doc_name ?? null;
    let nextQuestionDocText = existing.question_doc_text ?? null;
    let nextManuscriptDocUrl = existing.manuscript_doc_url ?? null;
    let nextManuscriptDocName = existing.manuscript_doc_name ?? null;
    let nextManuscriptDocText = existing.manuscript_doc_text ?? null;

    if (questionDocument instanceof File && questionDocument.size > 0) {
      const uploaded = await uploadPublicDocument(questionDocument, "materials/questions");
      nextQuestionDocUrl = uploaded.publicUrl;
      nextQuestionDocName = uploaded.fileName;
      nextQuestionDocText = questionDocText;
    }

    if (manuscriptDocument instanceof File && manuscriptDocument.size > 0) {
      const uploaded = await uploadPublicDocument(manuscriptDocument, "materials/manuscripts");
      nextManuscriptDocUrl = uploaded.publicUrl;
      nextManuscriptDocName = uploaded.fileName;
      nextManuscriptDocText = manuscriptDocText;
    }

    const { data, error } = await admin
      .from("video_posts")
      .update({
        title,
        body: null,
        scheduled_at: scheduledAt,
        messenger_name: messengerName,
        passage_book: passageBook,
        passage_start_chapter: passageStartChapter,
        passage_start_verse: passageStartVerse,
        passage_end_chapter: passageEndChapter,
        passage_end_verse: passageEndVerse,
        passage_verses: passageVerses,
        video_link: videoLink || null,
        question_doc_url: nextQuestionDocUrl,
        question_doc_name: nextQuestionDocName,
        question_doc_text: nextQuestionDocText,
        manuscript_doc_url: nextManuscriptDocUrl,
        manuscript_doc_name: nextManuscriptDocName,
        manuscript_doc_text: nextManuscriptDocText,
      })
      .eq("id", id)
      .select(
        "id, title, body, scheduled_at, messenger_name, passage_book, passage_start_chapter, passage_start_verse, passage_end_chapter, passage_end_verse, passage_verses, video_link, question_doc_url, question_doc_name, question_doc_text, manuscript_doc_url, manuscript_doc_name, manuscript_doc_text, created_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update material post." }, { status: 500 });
    }

    if (questionDocument instanceof File && questionDocument.size > 0) {
      await removePublicDocument(existing.question_doc_url);
    }

    if (manuscriptDocument instanceof File && manuscriptDocument.size > 0) {
      await removePublicDocument(existing.manuscript_doc_url);
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "video_posts",
      action: "update",
      metadata: {
        videoPostId: data.id,
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        ...data,
        thumbnail_url: thumbnailUrl,
        watch_url: watchUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update material post." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const roles = await getMemberRoles(session.member.id);
    const canCompose = roles.includes("admin") || roles.includes("leader");

    if (!canCompose) {
      return NextResponse.json({ error: "Only leaders and admins can delete materials." }, { status: 403 });
    }

    const { id } = await params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ success: true });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("video_posts")
      .select("id, question_doc_url, manuscript_doc_url")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Material post not found." }, { status: 404 });
    }

    const { error } = await admin.from("video_posts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await removePublicDocument(existing.question_doc_url);
    await removePublicDocument(existing.manuscript_doc_url);

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "video_posts",
      action: "delete",
      metadata: {
        videoPostId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete material post." },
      { status: 500 },
    );
  }
}
