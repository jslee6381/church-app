"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, LoaderCircle, MessageCircle, MoreVertical, SendHorizonal, Users, X } from "lucide-react";
import type { CommentReactionKind, CommunityUpdateComment, CommunityUpdateFeedItem, ReactionKind } from "@/lib/community-updates";

const CONTENT_LIMIT = 150;
const MAX_IMAGES = 10;
const MAX_IMAGE_DIMENSION = 1800;
const JPEG_QUALITY = 0.82;

type Props = {
  canManage: boolean;
  initialUpdates: CommunityUpdateFeedItem[];
  canReact: boolean;
  currentMemberPhotoUrl?: string | null;
  submitAccessState: "signed_out" | "pending" | "active";
};

type EditableCommunityImage =
  | {
      id: string;
      kind: "existing";
      url: string;
      name: string;
    }
  | {
      id: string;
      kind: "new";
      url: string;
      name: string;
      file: File;
    };

async function compressImageFile(file: File) {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
      element.src = objectUrl;
    });

    const { width, height } = image;

    if (!width || !height) {
      return file;
    }

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!blob) {
      return file;
    }

    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });

    return compressedFile.size < file.size ? compressedFile : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function HeartReactionIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className="h-[1.7rem] w-[1.7rem]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M12 20.5 4.9 13.9a4.8 4.8 0 0 1 6.8-6.8L12 7.4l.3-.3a4.8 4.8 0 1 1 6.8 6.8L12 20.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LikeReactionIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className="h-[1.7rem] w-[1.7rem]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M9.5 21H6a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2h3.5V21Zm0-11.5 3-6A1.8 1.8 0 0 1 14.2 2c1 0 1.8.8 1.8 1.8V7h3.5a2.5 2.5 0 0 1 2.4 3.1l-1.5 7A2.5 2.5 0 0 1 18 19H9.5V9.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function renderSmallCommentReactionIcon(kind: CommentReactionKind, active: boolean) {
  if (kind === "heart") {
    return <HeartReactionIcon active={active} />;
  }

  return <LikeReactionIcon active={active} />;
}

function ExpandImageIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M3 3l7 7M21 3l-7 7M3 21l7-7M21 21l-7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

export function CommunityUpdatesSection({
  canManage,
  initialUpdates,
  canReact,
  currentMemberPhotoUrl = null,
  submitAccessState,
}: Props) {
  const composerRef = useRef<HTMLFormElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const lightboxTouchStartXRef = useRef<number | null>(null);
  const editingImagesRef = useRef<EditableCommunityImage[]>([]);
  const router = useRouter();
  const [updates, setUpdates] = useState(initialUpdates);
  const [selectedReactions, setSelectedReactions] = useState<Record<string, ReactionKind>>(
    Object.fromEntries(
      initialUpdates
        .filter((item) => item.selectedReaction)
        .map((item) => [item.id, item.selectedReaction as ReactionKind]),
    ),
  );
  const [summary, setSummary] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [savingReactionId, setSavingReactionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState("");
  const [editingImages, setEditingImages] = useState<EditableCommunityImage[]>([]);
  const [isPreparingEditImages, setIsPreparingEditImages] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSubmitGate, setShowSubmitGate] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [openMenuUpdateId, setOpenMenuUpdateId] = useState<string | null>(null);
  const [currentImageIndexes, setCurrentImageIndexes] = useState<Record<string, number>>({});
  const [updateImageRatios, setUpdateImageRatios] = useState<Record<string, number[]>>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [lightboxState, setLightboxState] = useState<{ imageUrls: string[]; index: number } | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openCommentComposerId, setOpenCommentComposerId] = useState<string | null>(null);
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null);
  const [savingCommentReactionKey, setSavingCommentReactionKey] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setUpdates(initialUpdates);
    setSelectedReactions(
      Object.fromEntries(
        initialUpdates
          .filter((item) => item.selectedReaction)
          .map((item) => [item.id, item.selectedReaction as ReactionKind]),
      ),
    );
    setCurrentImageIndexes({});
    setUpdateImageRatios({});
    setExpandedComments({});
    setCommentDrafts({});
    setOpenCommentComposerId(null);
  }, [initialUpdates]);

  function getUpdateContent(update: CommunityUpdateFeedItem) {
    return update.body?.trim() || update.summary || update.legacyTitle || "";
  }

  function keepComposerVisible() {
    if (typeof window === "undefined") {
      return;
    }

    const scrollComposerIntoView = () => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      submitButtonRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    };

    window.requestAnimationFrame(scrollComposerIntoView);
    window.setTimeout(scrollComposerIntoView, 220);
    window.setTimeout(scrollComposerIntoView, 420);
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isComposerExpanded) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
      keepComposerVisible();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isComposerExpanded]);

  useEffect(() => {
    const nextPreviewUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(nextPreviewUrls);

    return () => {
      nextPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    editingImagesRef.current = editingImages;
  }, [editingImages]);

  useEffect(() => {
    return () => {
      editingImagesRef.current.forEach((image) => {
        if (image.kind === "new") {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!lightboxState) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxState(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        setLightboxState((current) =>
          current
            ? {
                ...current,
                index: current.index === 0 ? current.imageUrls.length - 1 : current.index - 1,
              }
            : current,
        );
      }

      if (event.key === "ArrowRight") {
        setLightboxState((current) =>
          current
            ? {
                ...current,
                index: current.index === current.imageUrls.length - 1 ? 0 : current.index + 1,
              }
            : current,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxState]);

  function openComposer() {
    setIsComposerExpanded(true);
  }

  function cancelComposer() {
    setIsComposerExpanded(false);
    setSummary("");
    setImageFiles([]);
    setFeedback("");
  }

  function clearEditState() {
    editingImages.forEach((image) => {
      if (image.kind === "new") {
        URL.revokeObjectURL(image.url);
      }
    });
    setEditingId(null);
    setEditingSummary("");
    setEditingImages([]);
    setIsPreparingEditImages(false);
  }

  function moveImage(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= imageFiles.length) {
      return;
    }

    setImageFiles((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);

      if (!moved) {
        return current;
      }

      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function moveEditImage(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= editingImages.length) {
      return;
    }

    setEditingImages((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);

      if (!moved) {
        return current;
      }

      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function removeEditImage(imageId: string) {
    setEditingImages((current) => {
      const target = current.find((image) => image.id === imageId);

      if (target?.kind === "new") {
        URL.revokeObjectURL(target.url);
      }

      return current.filter((image) => image.id !== imageId);
    });
  }

  function openLightbox(imageUrls: string[], index: number) {
    setLightboxState({ imageUrls, index });
  }

  function showPreviousLightboxImage() {
    setLightboxState((current) =>
      current
        ? {
            ...current,
            index: current.index === 0 ? current.imageUrls.length - 1 : current.index - 1,
          }
        : current,
    );
  }

  function showNextLightboxImage() {
    setLightboxState((current) =>
      current
        ? {
            ...current,
            index: current.index === current.imageUrls.length - 1 ? 0 : current.index + 1,
          }
        : current,
    );
  }

  function handleLightboxTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    lightboxTouchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleLightboxTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (lightboxTouchStartXRef.current === null || !lightboxState || lightboxState.imageUrls.length < 2) {
      lightboxTouchStartXRef.current = null;
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? lightboxTouchStartXRef.current;
    const deltaX = endX - lightboxTouchStartXRef.current;
    lightboxTouchStartXRef.current = null;

    if (Math.abs(deltaX) < 36) {
      return;
    }

    if (deltaX > 0) {
      showPreviousLightboxImage();
      return;
    }

    showNextLightboxImage();
  }

  async function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES);

    if (selectedFiles.length === 0) {
      setImageFiles([]);
      return;
    }

    setIsPreparingImages(true);
    setFeedback("");

    try {
      const preparedFiles = await Promise.all(selectedFiles.map((file) => compressImageFile(file)));
      setImageFiles(preparedFiles);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to prepare images.");
    } finally {
      setIsPreparingImages(false);
      event.target.value = "";
    }
  }

  function handleImageScroll(updateId: string, event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const width = container.clientWidth;

    if (!width) {
      return;
    }

    const nextIndex = Math.round(container.scrollLeft / width);
    setCurrentImageIndexes((current) =>
      current[updateId] === nextIndex
        ? current
        : {
            ...current,
            [updateId]: nextIndex,
          },
    );
  }

  function handleFeedImageLoad(updateId: string, imageIndex: number, event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const ratio = image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1;

    setUpdateImageRatios((current) => {
      const next = [...(current[updateId] ?? [])];
      next[imageIndex] = ratio;

      const unchanged =
        next.length === (current[updateId] ?? []).length &&
        next.every((value, index) => value === (current[updateId] ?? [])[index]);

      if (unchanged) {
        return current;
      }

      return {
        ...current,
        [updateId]: next,
      };
    });
  }

  function shouldUseFramedCarousel(update: CommunityUpdateFeedItem) {
    return update.imageUrls.length > 1;
  }

  function getCurrentMemberAvatar() {
    if (currentMemberPhotoUrl) {
      return (
        <img
          alt="Your profile"
          className="size-8 rounded-full object-cover"
          src={currentMemberPhotoUrl}
        />
      );
    }

    return (
      <div className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Users className="size-4" />
      </div>
    );
  }

  function getCommentAvatar(comment: CommunityUpdateComment) {
    if (comment.authorPhotoUrl) {
      return (
        <img
          alt={`${comment.authorName} profile`}
          className="size-8 rounded-full object-cover"
          src={comment.authorPhotoUrl}
        />
      );
    }

    return (
      <div className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Users className="size-4" />
      </div>
    );
  }

  function ensureCommentAccess() {
    if (submitAccessState === "signed_out") {
      router.push("/access-required?context=community-feed&next=%2Fhome");
      return false;
    }

    if (submitAccessState !== "active") {
      if (submitAccessState === "pending") {
        router.push("/access-required?mode=pending&context=community-feed&next=%2Fhome");
        return false;
      }

      setShowSubmitGate(true);
      setFeedback("");
      return false;
    }

    return true;
  }

  function toggleComments(updateId: string) {
    setExpandedComments((current) => ({
      ...current,
      [updateId]: !current[updateId],
    }));
  }

  function openCommentComposer(updateId: string) {
    if (!ensureCommentAccess()) {
      return;
    }

    setExpandedComments((current) => ({
      ...current,
      [updateId]: true,
    }));
    setOpenCommentComposerId(updateId);
  }

  function startEditingComment(comment: CommunityUpdateComment) {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.message);
    setOpenCommentMenuId(null);
    setFeedback("");
  }

  async function saveComment(updateId: string, commentId: string) {
    const message = editingCommentText.trim();
    if (!message) {
      return;
    }

    setSavingCommentId(commentId);
    setFeedback("");

    try {
      const response = await fetch(`/api/community-updates/${updateId}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update comment.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                comments: item.comments.map((comment) =>
                  comment.id === commentId ? { ...comment, message: payload.comment.message } : comment,
                ),
              }
            : item,
        ),
      );
      setEditingCommentId(null);
      setEditingCommentText("");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update comment.");
    } finally {
      setSavingCommentId(null);
    }
  }

  async function deleteComment(updateId: string, commentId: string) {
    setDeletingCommentId(commentId);
    setFeedback("");

    try {
      const response = await fetch(`/api/community-updates/${updateId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete comment.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                comments: item.comments.filter((comment) => comment.id !== commentId),
                commentCount: Math.max(0, item.commentCount - 1),
              }
            : item,
        ),
      );
      setOpenCommentMenuId(null);
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentText("");
      }
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function toggleCommentReaction(updateId: string, commentId: string, reactionKind: CommentReactionKind) {
    if (!canReact) {
      return;
    }

    const reactionKey = `${commentId}:${reactionKind}`;
    setSavingCommentReactionKey(reactionKey);
    setFeedback("");

    try {
      const response = await fetch(`/api/community-updates/${updateId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionKind }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update reaction.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                comments: item.comments.map((comment) =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        reactionCounts: payload.reactionCounts,
                        selectedReaction: payload.selectedReaction,
                      }
                    : comment,
                ),
              }
            : item,
        ),
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update reaction.");
    } finally {
      setSavingCommentReactionKey(null);
    }
  }

  async function submitComment(updateId: string) {
    if (!ensureCommentAccess()) {
      return;
    }

    const message = (commentDrafts[updateId] ?? "").trim();

    if (!message) {
      return;
    }

    setPostingCommentId(updateId);
    setFeedback("");

    try {
      const response = await fetch(`/api/community-updates/${updateId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to post comment.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                comments: [...item.comments, {
                  reactionCounts: { heart: 0, like: 0 },
                  selectedReaction: null,
                  isOwner: true,
                  ...payload.comment,
                }],
                commentCount: item.commentCount + 1,
              }
            : item,
        ),
      );
      setCommentDrafts((current) => ({
        ...current,
        [updateId]: "",
      }));
      setExpandedComments((current) => ({
        ...current,
        [updateId]: true,
      }));
      setOpenCommentComposerId(null);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to post comment.");
    } finally {
      setPostingCommentId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitAccessState === "signed_out") {
      router.push("/access-required?context=community-feed&next=%2Fhome");
      return;
    }

    if (submitAccessState !== "active") {
      if (submitAccessState === "pending") {
        router.push("/access-required?mode=pending&context=community-feed&next=%2Fhome");
        return;
      }

      setShowSubmitGate(true);
      setFeedback("");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");
    setShowSubmitGate(false);

    try {
      const formData = new FormData();
      formData.set("summary", summary);

      imageFiles.forEach((file) => formData.append("images", file, file.name));

      const response = await fetch("/api/community-updates", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit community update.");
      }

      setSummary("");
      setImageFiles([]);
      setIsComposerExpanded(false);
      setFeedback(payload.message ?? "Your community update was published.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to submit community update.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleReaction(updateId: string, reactionKind: ReactionKind) {
    if (!canReact) {
      return;
    }

    setSavingReactionId(updateId);
    setFeedback("");

    const currentKind = selectedReactions[updateId];
    const willRemove = currentKind === reactionKind;

    try {
      const response = await fetch(`/api/community-updates/${updateId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionKind }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update reaction.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                reactionCounts: payload.reactionCounts,
                selectedReaction: payload.selectedReaction,
              }
            : item,
        ),
      );
      if (!payload.reacted || willRemove || !payload.selectedReaction) {
        setSelectedReactions((current) => {
          const next = { ...current };
          delete next[updateId];
          return next;
        });
      } else {
        setSelectedReactions((current) => ({
          ...current,
          [updateId]: payload.selectedReaction,
        }));
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update reaction.");
    } finally {
      setSavingReactionId(null);
    }
  }

  function startEditing(update: CommunityUpdateFeedItem) {
    editingImagesRef.current.forEach((image) => {
      if (image.kind === "new") {
        URL.revokeObjectURL(image.url);
      }
    });
    setEditingId(update.id);
    setEditingSummary(getUpdateContent(update));
    setEditingImages(
      update.imageUrls.map((imageUrl, index) => ({
        id: `existing-${update.id}-${index}`,
        kind: "existing",
        url: imageUrl,
        name: `Photo ${index + 1}`,
      })),
    );
    setFeedback("");
    setOpenMenuUpdateId(null);
  }

  async function handleEditImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = Math.max(0, MAX_IMAGES - editingImages.length);
    const nextFiles = selectedFiles.slice(0, remainingSlots);

    if (nextFiles.length === 0) {
      setFeedback(`You can upload up to ${MAX_IMAGES} images.`);
      event.target.value = "";
      return;
    }

    setIsPreparingEditImages(true);
    setFeedback("");

    try {
      const preparedFiles = await Promise.all(nextFiles.map((file) => compressImageFile(file)));
      const nextImages: EditableCommunityImage[] = preparedFiles.map((file, index) => ({
        id: `new-${Date.now()}-${index}-${file.name}`,
        kind: "new",
        url: URL.createObjectURL(file),
        name: file.name,
        file,
      }));

      setEditingImages((current) => [...current, ...nextImages]);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to prepare images.");
    } finally {
      setIsPreparingEditImages(false);
      event.target.value = "";
    }
  }

  async function saveEdit(updateId: string) {
    setIsSavingEdit(true);
    setFeedback("");

    try {
      const formData = new FormData();
      formData.set("summary", editingSummary);

      const imageOrder = editingImages.map((image, index) =>
        image.kind === "existing"
          ? { kind: "existing", url: image.url, index }
          : { kind: "new", index, uploadIndex: editingImages.filter((candidate, candidateIndex) => candidate.kind === "new" && candidateIndex <= index).length - 1 },
      );

      formData.set("imageOrder", JSON.stringify(imageOrder));
      editingImages.forEach((image) => {
        if (image.kind === "new") {
          formData.append("images", image.file, image.file.name);
        }
      });

      const response = await fetch(`/api/community-updates/${updateId}`, {
        method: "PATCH",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update community update.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                summary: payload.update.summary,
                body: payload.update.body,
                imageUrl: payload.update.imageUrls?.[0] ?? null,
                imageUrls: payload.update.imageUrls ?? [],
                status: payload.update.status,
              }
            : item,
        ),
      );
      clearEditState();
      setFeedback(payload.message ?? "Your update was published.");
      setOpenMenuUpdateId(null);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update community update.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deleteUpdate(updateId: string) {
    setDeletingId(updateId);
    setFeedback("");

    try {
      const response = await fetch(`/api/community-updates/${updateId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete community update.");
      }

      setUpdates((current) => current.filter((item) => item.id !== updateId));
      if (editingId === updateId) {
        setEditingId(null);
      }
      setFeedback(payload.message ?? "Community update deleted.");
      setOpenMenuUpdateId(null);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete community update.");
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusLabel(status: CommunityUpdateFeedItem["status"]) {
    switch (status) {
      case "rejected":
        return "Needs changes";
      case "archived":
        return "Archived";
      default:
        return null;
    }
  }

  const reactionKinds: ReactionKind[] = ["heart", "like"];

  function renderReactionIcon(kind: ReactionKind, active: boolean) {
    switch (kind) {
      case "heart":
        return <HeartReactionIcon active={active} />;
      case "like":
        return <LikeReactionIcon active={active} />;
      default:
        return null;
    }
  }

  function getReactionClassName(kind: ReactionKind, active: boolean) {
    if (!active) {
      return "text-muted-foreground";
    }

    switch (kind) {
      case "heart":
        return "text-red-500";
      case "like":
        return "text-blue-500";
      default:
        return "text-primary";
    }
  }

  return (
    <div className="overflow-hidden rounded-[16px] bg-transparent shadow-none">
      <div className="mb-3 px-4 pt-1 pb-2">
        <form className="scroll-mb-40" onSubmit={handleSubmit} ref={composerRef}>
          <div className="grid gap-3">
            <div className={`flex gap-3 ${isComposerExpanded ? "items-start" : "items-center"}`}>
              {!isComposerExpanded ? (
                currentMemberPhotoUrl ? (
                  <img alt="Your profile" className="shrink-0 self-center size-10 rounded-full object-cover" src={currentMemberPhotoUrl} />
                ) : (
                  <div className="inline-flex shrink-0 self-center size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Users className="size-5" />
                  </div>
                )
              ) : null}
              <div
                className={`community-form-input relative min-w-0 flex-1 rounded-[16px] border border-input bg-white ${
                  isComposerExpanded ? "px-3 py-2" : "px-3 py-0"
                }`}
              >
                <textarea
                  ref={composerTextareaRef}
                  className={`w-full resize-none rounded-[16px] border-0 bg-transparent outline-none focus:border-0 focus:shadow-none ${
                    isComposerExpanded ? "min-h-[110px] px-0 py-1 pb-8" : "h-8 min-h-8 py-[6px] pr-10 pl-0"
                  }`}
                  maxLength={CONTENT_LIMIT}
                  onChange={(event) => setSummary(event.target.value)}
                  onFocus={() => {
                    openComposer();
                    keepComposerVisible();
                  }}
                  placeholder="Share an update..."
                  rows={1}
                  value={summary}
                />
                {isComposerExpanded ? (
                  <span className="pointer-events-none absolute bottom-3 right-0 text-xs text-muted-foreground">
                    {summary.length}/{CONTENT_LIMIT}
                  </span>
                ) : (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <SendHorizonal className="size-4" />
                  </span>
                )}
              </div>
            </div>

            {isComposerExpanded ? (
              <>
              <label className="grid gap-2 text-sm font-medium text-muted-foreground">
                Photos optional, up to {MAX_IMAGES} images, JPG/PNG/WEBP up to 8 MB each
                <input
                  multiple
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  className="community-form-input min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)] file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-accent-foreground"
                  onChange={handleImageSelection}
                  onFocus={keepComposerVisible}
                  type="file"
                />
              </label>
              {imageFiles.length > 0 ? (
                <div className="grid gap-2">
                  <p className="m-0 text-sm text-muted-foreground">{imageFiles.length}/{MAX_IMAGES} selected</p>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {imageFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="community-form-input w-[156px] shrink-0 overflow-hidden rounded-[14px] border border-border/70 bg-white"
                      >
                        <img
                          alt={`Selected upload ${index + 1}`}
                          className="block h-28 w-full object-cover"
                          src={imagePreviewUrls[index]}
                        />
                        <div className="grid gap-2 px-3 py-3">
                          <p className="m-0 truncate text-sm text-muted-foreground">{file.name}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              className="community-form-input inline-flex min-h-10 items-center justify-center rounded-[12px] border border-border/70 bg-white text-foreground disabled:opacity-35"
                              disabled={index === 0}
                              onClick={() => moveImage(index, index - 1)}
                              type="button"
                            >
                              <ChevronLeft className="size-4" />
                            </button>
                            <button
                              className="community-form-input inline-flex min-h-10 items-center justify-center rounded-[12px] border border-border/70 bg-white text-foreground disabled:opacity-35"
                              disabled={index === imageFiles.length - 1}
                              onClick={() => moveImage(index, index + 1)}
                              type="button"
                            >
                              <ChevronRight className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {isPreparingImages ? (
                <p className="m-0 text-sm text-muted-foreground">Preparing photos for upload...</p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="community-form-input inline-flex min-h-12 items-center justify-center rounded-[16px] border border-input bg-white px-5 text-base font-semibold text-foreground disabled:opacity-60"
                  disabled={isSubmitting || isPreparingImages}
                  onClick={cancelComposer}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
                  disabled={isSubmitting || isPreparingImages}
                  ref={submitButtonRef}
                  type="submit"
                >
                  {isSubmitting || isPreparingImages ? <LoaderCircle className="size-5 animate-spin" /> : "Post"}
                </button>
              </div>
              </>
            ) : null}
          </div>
        </form>

        {showSubmitGate && submitAccessState === "pending" ? (
          <div className="community-form-surface mt-4 rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-5 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Awaiting Approval</p>
            <h3 className="mb-3 mt-3 font-sans text-[1.35rem] leading-tight text-foreground">
              You are signed in. A church admin still needs to approve your member access.
            </h3>
            <p className="ui-text m-0 text-muted-foreground">
              Once approved, you will be able to post updates and photos to the community feed.
            </p>
            <div className="mt-5">
              <Link
                className="community-form-input inline-flex min-h-11 items-center rounded-[16px] border border-border/80 bg-white/80 px-4 text-sm font-semibold text-foreground transition hover:bg-white"
                href="/settings"
              >
                Open Settings
              </Link>
            </div>
          </div>
        ) : null}

        {feedback ? <p className="mt-3 m-0 text-sm text-muted-foreground">{feedback}</p> : null}
      </div>

      <div className="pb-4">
        {updates.map((update, index) => (
          <article
            key={update.id}
            className={`relative pb-2 last:pb-0 ${index > 0 ? "border-t border-border/70 pt-2" : ""} ${openMenuUpdateId === update.id || update.comments.some((comment) => comment.id === openCommentMenuId) ? "z-30 overflow-visible" : "z-0 overflow-hidden"}`}
          >
            <div className="px-4 pt-1 pb-2">
              <div className="flex min-h-[36px] items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {update.authorPhotoUrl ? (
                    <img
                      alt={`${update.authorName} profile`}
                      className="size-9 rounded-full object-cover"
                      src={update.authorPhotoUrl}
                    />
                  ) : (
                    <div className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Users className="size-4" />
                    </div>
                  )}
                  <p className="m-0 text-sm font-semibold text-foreground">{update.authorName}</p>
                </div>
                <p className="m-0 text-sm text-muted-foreground">{update.dateLabel}</p>
              </div>
            </div>
            {update.imageUrls.length > 0 ? (
              <div>
                {shouldUseFramedCarousel(update) ? (
                  <div className="relative overflow-hidden">
                    <img
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none block w-full opacity-0 select-none"
                      onLoad={(event) => handleFeedImageLoad(update.id, 0, event)}
                      src={update.imageUrls[0]}
                    />
                    <div
                      className="no-scrollbar absolute inset-0 flex h-full snap-x snap-mandatory overflow-x-auto"
                      onScroll={(event) => handleImageScroll(update.id, event)}
                    >
                      {update.imageUrls.map((imageUrl, index) => (
                        <button
                          key={`${update.id}-${index}`}
                          className="relative h-full w-full shrink-0 snap-center bg-transparent p-0"
                          onClick={() => openLightbox(update.imageUrls, index)}
                          type="button"
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <img
                              alt={`Community update image ${index + 1}`}
                              className="block h-full w-full object-contain object-center"
                              onLoad={(event) => handleFeedImageLoad(update.id, index, event)}
                              src={imageUrl}
                            />
                          </div>
                          <span className="pointer-events-none absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-[2px]">
                            <ExpandImageIcon />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  update.imageUrls.map((imageUrl, index) => (
                    <button
                      key={`${update.id}-${index}`}
                      className="relative block w-full bg-transparent p-0"
                      onClick={() => openLightbox(update.imageUrls, index)}
                      type="button"
                    >
                      <img
                        alt={`Community update image ${index + 1}`}
                        className="block h-auto w-full"
                        onLoad={(event) => handleFeedImageLoad(update.id, index, event)}
                        src={imageUrl}
                      />
                      <span className="pointer-events-none absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-[2px]">
                        <ExpandImageIcon />
                      </span>
                    </button>
                  ))
                )}
                {update.imageUrls.length > 1 ? (
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    {update.imageUrls.map((_, imageIndex) => {
                      const isActive = (currentImageIndexes[update.id] ?? 0) === imageIndex;

                      return (
                        <span
                          key={`${update.id}-dot-${imageIndex}`}
                          aria-hidden="true"
                          className={`size-1.5 rounded-full transition ${
                            isActive ? "bg-foreground" : "bg-border"
                          }`}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={`px-4 ${update.imageUrls.length > 1 ? "pt-2" : "pt-3"}`}>
              {editingId === update.id ? (
                <div className="grid gap-3">
                  <div className="relative">
                    <textarea
                      className="community-form-input min-h-[110px] w-full rounded-[16px] border border-input bg-white px-4 py-3 pb-8 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                      maxLength={CONTENT_LIMIT}
                      onChange={(event) => setEditingSummary(event.target.value)}
                      value={editingSummary}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                      {editingSummary.length}/{CONTENT_LIMIT}
                    </span>
                  </div>
                  <label className="grid gap-2 text-sm font-medium text-muted-foreground">
                    Add or remove photos, up to {MAX_IMAGES} images total
                    <input
                      multiple
                      accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                      className="community-form-input min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)] file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-accent-foreground"
                      onChange={handleEditImageSelection}
                      type="file"
                    />
                  </label>
                  {editingImages.length > 0 ? (
                    <div className="grid gap-2">
                      <p className="m-0 text-sm text-muted-foreground">{editingImages.length}/{MAX_IMAGES} selected</p>
                      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                        {editingImages.map((image, index) => (
                          <div
                            key={image.id}
                            className="community-form-input w-[156px] shrink-0 overflow-hidden rounded-[14px] border border-border/70 bg-white"
                          >
                            <img
                              alt={`Edit image ${index + 1}`}
                              className="block h-28 w-full object-cover"
                              src={image.url}
                            />
                            <div className="grid gap-2 px-3 py-3">
                              <p className="m-0 truncate text-sm text-muted-foreground">{image.name}</p>
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  className="community-form-input inline-flex min-h-10 items-center justify-center rounded-[12px] border border-border/70 bg-white text-foreground disabled:opacity-35"
                                  disabled={index === 0}
                                  onClick={() => moveEditImage(index, index - 1)}
                                  type="button"
                                >
                                  <ChevronLeft className="size-4" />
                                </button>
                                <button
                                  className="community-form-input inline-flex min-h-10 items-center justify-center rounded-[12px] border border-border/70 bg-white text-foreground disabled:opacity-35"
                                  disabled={index === editingImages.length - 1}
                                  onClick={() => moveEditImage(index, index + 1)}
                                  type="button"
                                >
                                  <ChevronRight className="size-4" />
                                </button>
                                <button
                                  className="community-form-input inline-flex min-h-10 items-center justify-center rounded-[12px] border border-border/70 bg-white text-foreground"
                                  onClick={() => removeEditImage(image.id)}
                                  type="button"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {isPreparingEditImages ? (
                    <p className="m-0 text-sm text-muted-foreground">Preparing photos for upload...</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="community-form-input inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-border/70 bg-white px-4 text-sm font-semibold text-foreground"
                      onClick={clearEditState}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      disabled={isSavingEdit || isPreparingEditImages}
                      onClick={() => saveEdit(update.id)}
                      type="button"
                    >
                      {isSavingEdit ? <LoaderCircle className="size-4 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="ui-text m-0 text-foreground">{getUpdateContent(update)}</p>
                </>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                {update.status === "approved" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {reactionKinds.map((kind) => {
                        const active = selectedReactions[update.id] === kind;
                        const count = update.reactionCounts[kind];

                        return (
                          <button
                            key={`${update.id}-${kind}`}
                            aria-label={kind}
                            className={`inline-flex items-center gap-1 rounded-full px-1 py-1 ${getReactionClassName(
                              kind,
                              active,
                            )}`}
                            disabled={!canReact || savingReactionId === update.id}
                            onClick={() => toggleReaction(update.id, kind)}
                            type="button"
                          >
                            {savingReactionId === update.id && selectedReactions[update.id] === kind ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              renderReactionIcon(kind, active)
                            )}
                            <span className="text-[1rem] font-semibold">{count}</span>
                          </button>
                        );
                      })}
                      <button
                        aria-label="Comments"
                        className="inline-flex items-center gap-1 rounded-full px-1 py-1 text-foreground"
                        onClick={() => toggleComments(update.id)}
                        type="button"
                      >
                        <MessageCircle className="size-[1.4rem]" />
                        <span className="text-[1rem] font-semibold">{update.commentCount}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
                {editingId !== update.id && (update.isOwner || canManage) && getStatusLabel(update.status) ? (
                  <span className="community-card-surface rounded-full border border-border/70 bg-white/88 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {getStatusLabel(update.status)}
                  </span>
                ) : null}
              </div>
              <div className="relative flex items-center gap-2">
                {(update.isOwner || canManage) && editingId !== update.id ? (
                  <div className="relative">
                    <button
                      aria-label="Update actions"
                      className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                      onClick={() =>
                        setOpenMenuUpdateId((current) => (current === update.id ? null : update.id))
                      }
                      type="button"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuUpdateId === update.id ? (
                      <div className="absolute right-0 top-[calc(100%+0.25rem)] z-20 min-w-[148px] overflow-hidden rounded-[14px] border border-border bg-background shadow-[0_4px_12px_rgba(68,52,35,0.08)]">
                        <button
                          className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                          onClick={() => startEditing(update)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="flex min-h-11 w-full items-center border-t border-border/70 px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                          disabled={deletingId === update.id}
                          onClick={() => deleteUpdate(update.id)}
                          type="button"
                        >
                          {deletingId === update.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {expandedComments[update.id] ? (
              <div className="px-4 pt-3">
                {update.comments.length > 0 ? (
                  <div className="space-y-3 pb-3">
                    {update.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        {getCommentAvatar(comment)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="m-0 text-sm font-semibold text-foreground">{comment.authorName}</p>
                                <p className="m-0 text-xs text-muted-foreground">{comment.createdAtLabel}</p>
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="mt-2 grid gap-3">
                                  <div className="relative">
                                    <textarea
                                      className="community-form-input min-h-[96px] w-full rounded-[16px] border border-input bg-white px-4 py-3 pb-8 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                                      maxLength={CONTENT_LIMIT}
                                      onChange={(event) => setEditingCommentText(event.target.value)}
                                      value={editingCommentText}
                                    />
                                    <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                                      {editingCommentText.length}/{CONTENT_LIMIT}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      className="community-form-input inline-flex min-h-10 items-center justify-center rounded-[14px] border border-border/70 bg-white px-4 text-sm font-semibold text-foreground"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentText("");
                                      }}
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className="inline-flex min-h-10 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                                      disabled={savingCommentId === comment.id || !editingCommentText.trim()}
                                      onClick={() => saveComment(update.id, comment.id)}
                                      type="button"
                                    >
                                      {savingCommentId === comment.id ? <LoaderCircle className="size-4 animate-spin" /> : "Save"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="ui-text m-0 text-muted-foreground">{comment.message}</p>
                              )}
                              {editingCommentId !== comment.id ? (
                                <div className="mt-1 flex items-center gap-2">
                                  {(["heart", "like"] as CommentReactionKind[]).map((kind) => {
                                    const active = comment.selectedReaction === kind;
                                    const count = comment.reactionCounts[kind];
                                    const reactionKey = `${comment.id}:${kind}`;
                                    return (
                                      <button
                                        key={reactionKey}
                                        aria-label={kind}
                                        className="inline-flex items-center gap-1 bg-transparent px-0 py-0 text-foreground"
                                        disabled={!canReact || savingCommentReactionKey === reactionKey}
                                        onClick={() => toggleCommentReaction(update.id, comment.id, kind)}
                                        type="button"
                                      >
                                        <span className={`inline-flex h-4 w-4 items-center justify-center ${active ? "text-foreground" : "text-muted-foreground"}`}>
                                          <span className="scale-[0.7]">{savingCommentReactionKey === reactionKey ? <LoaderCircle className="size-3 animate-spin" /> : renderSmallCommentReactionIcon(kind, active)}</span>
                                        </span>
                                        <span className="text-[0.8rem] font-medium text-muted-foreground">{count}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                            {(comment.isOwner || canManage) && editingCommentId !== comment.id ? (
                              <div className="relative shrink-0">
                                <button
                                  aria-label="Comment actions"
                                  className="inline-flex size-8 items-center justify-center bg-transparent text-foreground"
                                  onClick={() => setOpenCommentMenuId((current) => (current === comment.id ? null : comment.id))}
                                  type="button"
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                                {openCommentMenuId === comment.id ? (
                                  <div className="absolute right-0 top-[calc(100%+0.25rem)] z-20 min-w-[148px] overflow-hidden rounded-[14px] border border-border bg-background shadow-[0_4px_12px_rgba(68,52,35,0.08)]">
                                    <button
                                      className="flex min-h-10 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                                      onClick={() => startEditingComment(comment)}
                                      type="button"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="flex min-h-10 w-full items-center border-t border-border/70 px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                                      disabled={deletingCommentId === comment.id}
                                      onClick={() => deleteComment(update.id, comment.id)}
                                      type="button"
                                    >
                                      {deletingCommentId === comment.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-start gap-3 pt-1">
                  {getCurrentMemberAvatar()}
                  <div className="min-w-0 flex-1">
                    {openCommentComposerId === update.id ? (
                      <div className="grid gap-3">
                        <div className="relative">
                          <textarea
                            className="community-form-input min-h-[110px] w-full rounded-[16px] border border-input bg-white px-4 py-3 pb-8 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                            maxLength={CONTENT_LIMIT}
                            onChange={(event) =>
                              setCommentDrafts((current) => ({
                                ...current,
                                [update.id]: event.target.value,
                              }))
                            }
                            placeholder="Write a comment..."
                            value={commentDrafts[update.id] ?? ""}
                          />
                          <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                            {(commentDrafts[update.id] ?? "").length}/{CONTENT_LIMIT}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            className="community-form-input inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border/70 bg-white px-4 text-sm font-semibold text-foreground"
                            onClick={() => {
                              setOpenCommentComposerId(null);
                              setCommentDrafts((current) => ({ ...current, [update.id]: "" }));
                            }}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                            disabled={postingCommentId === update.id || !(commentDrafts[update.id] ?? "").trim()}
                            onClick={() => submitComment(update.id)}
                            type="button"
                          >
                            {postingCommentId === update.id ? <LoaderCircle className="size-4 animate-spin" /> : "Post"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="community-form-input flex min-h-11 w-full items-center rounded-[16px] border border-input bg-white px-4 text-left text-sm text-muted-foreground"
                        onClick={() => openCommentComposer(update.id)}
                        type="button"
                      >
                        Write a comment...
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {isClient && lightboxState
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] bg-black"
              onClick={() => setLightboxState(null)}
            >
              <div className="absolute right-3 top-3 z-20">
                <button
                  aria-label="Close image viewer"
                  className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white"
                  onClick={() => setLightboxState(null)}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div
                className="relative flex h-screen w-screen items-center justify-center px-0 py-16"
                onClick={(event) => event.stopPropagation()}
                onTouchEnd={handleLightboxTouchEnd}
                onTouchStart={handleLightboxTouchStart}
              >
                {lightboxState.imageUrls.length > 1 ? (
                  <button
                    aria-label="Previous image"
                    className="absolute left-1 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
                    onClick={showPreviousLightboxImage}
                    type="button"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                ) : null}
                <div className="flex h-full w-full items-center justify-center">
                  <img
                    alt={`Expanded community update image ${lightboxState.index + 1}`}
                    className="block max-h-full max-w-full object-contain object-center"
                    src={lightboxState.imageUrls[lightboxState.index]}
                  />
                </div>
                {lightboxState.imageUrls.length > 1 ? (
                  <button
                    aria-label="Next image"
                    className="absolute right-1 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
                    onClick={showNextLightboxImage}
                    type="button"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                ) : null}
                {lightboxState.imageUrls.length > 1 ? (
                  <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center justify-center gap-2">
                    {lightboxState.imageUrls.map((_, index) => (
                      <span
                        key={`lightbox-dot-${index}`}
                        aria-hidden="true"
                        className={`size-2 rounded-full ${
                          lightboxState.index === index ? "bg-white" : "bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
