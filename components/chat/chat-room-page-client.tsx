"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Search, SendHorizonal, Users, X } from "lucide-react";
import type { ChatCandidateMember, ChatRoomDetail, ChatRoomMember } from "@/lib/chat";

type Props = {
  room: ChatRoomDetail;
};

const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 120;

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMessageDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getMessageDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function ChatRoomPageClient({ room }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [members, setMembers] = useState<ChatRoomMember[]>([]);
  const [candidates, setCandidates] = useState<ChatCandidateMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [message]);

  const filteredCandidates = candidates.filter((member) =>
    member.displayName.toLowerCase().includes(memberSearch.trim().toLowerCase()),
  );

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((value) => value !== memberId)
        : [...current, memberId],
    );
  }

  async function openMembersModal() {
    setIsMembersOpen(true);
    setIsLoadingMembers(true);
    setMembersError(null);

    try {
      const response = await fetch(`/api/chat/rooms/${room.id}/members`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        error?: string;
        members?: ChatRoomMember[];
        candidates?: ChatCandidateMember[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load members.");
      }

      setMembers(payload.members ?? []);
      setCandidates(payload.candidates ?? []);
      setSelectedMemberIds([]);
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Unable to load members.");
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function handleAddMembers() {
    if (selectedMemberIds.length === 0) {
      return;
    }

    setIsSavingMembers(true);
    setMembersError(null);

    try {
      const response = await fetch(`/api/chat/rooms/${room.id}/members`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          memberIds: selectedMemberIds,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        members?: ChatRoomMember[];
        candidates?: ChatCandidateMember[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update members.");
      }

      setMembers(payload.members ?? []);
      setCandidates(payload.candidates ?? []);
      setSelectedMemberIds([]);
      router.refresh();
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Unable to update members.");
    } finally {
      setIsSavingMembers(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          body: message,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send message.");
      }

      setMessage("");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 pb-[calc(env(safe-area-inset-bottom)+108px)]">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <div className="w-11 shrink-0">
          <Link
            className="inline-flex min-h-11 items-center bg-transparent px-0 text-foreground"
            href="/chat"
          >
            <ChevronLeft className="size-4" />
          </Link>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h1
            className="m-0 truncate font-sans leading-tight font-semibold text-foreground"
            style={{ fontSize: "calc(var(--ui-text-size) * 1.15)" }}
          >
            {room.title}
          </h1>
        </div>
        <div className="flex w-11 shrink-0 justify-end">
          <button
            className="ui-text inline-flex items-center gap-2 rounded-[14px] border border-input bg-card px-3 py-2 text-muted-foreground transition hover:bg-card"
            onClick={() => void openMembersModal()}
            type="button"
          >
            <Users className="size-4" />
            {room.memberCount}
          </button>
        </div>
      </header>

      {room.description ? (
        <p className="ui-text m-0 text-center text-muted-foreground">{room.description}</p>
      ) : null}

      <section className="space-y-3">
        {room.messages.length === 0 ? (
          <p className="ui-text m-0 py-10 text-center text-muted-foreground">No messages yet.</p>
        ) : (
          room.messages.map((message, index) => {
            const currentDateKey = getMessageDateKey(message.createdAt);
            const previousDateKey = index > 0 ? getMessageDateKey(room.messages[index - 1].createdAt) : null;
            const showDateLabel = currentDateKey !== previousDateKey;

            return (
              <div className="space-y-2" key={message.id}>
                {showDateLabel ? (
                  <div className="flex justify-center pt-2">
                    <p className="ui-text m-0 text-center text-muted-foreground">
                      {formatMessageDate(message.createdAt)}
                    </p>
                  </div>
                ) : null}
                <div
                  className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[85%] items-end gap-2 ${message.isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                      className={`rounded-[18px] px-4 py-3 ${
                        message.isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground"
                      }`}
                    >
                      {!message.isOwnMessage ? (
                        <p className="ui-text m-0 mb-1 font-semibold text-current">{message.senderName}</p>
                      ) : null}
                      <p className="ui-text m-0 whitespace-pre-wrap break-words text-current">{message.body}</p>
                    </div>
                    <p className="ui-text mb-1 shrink-0 text-[0.65rem] text-muted-foreground">
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      <div className="chat-composer-shell fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-2 backdrop-blur-2xl">
        <div className="mx-auto max-w-[560px]">
          {errorMessage ? (
            <p className="ui-text mb-3 rounded-[14px] border border-destructive/20 bg-destructive/8 px-4 py-3 text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
            <button
              aria-label="More options"
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-[16px] border border-input bg-card text-foreground transition hover:bg-card"
              type="button"
            >
              <Plus className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <textarea
                ref={(node) => {
                  textareaRef.current = node;
                  resizeTextarea(node);
                }}
                className="ui-text min-h-12 w-full resize-none rounded-[16px] border border-input bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write a message..."
                rows={1}
                value={message}
              />
            </div>
            <button
              aria-label={isSubmitting ? "Sending message" : "Send message"}
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-primary text-primary-foreground transition hover:bg-primary disabled:opacity-60"
              disabled={isSubmitting || !message.trim()}
              type="submit"
            >
              <SendHorizonal className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {isMembersOpen ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/50">
          <div className="mx-auto flex min-h-full w-full max-w-[560px] items-start justify-center px-4 pt-5 pb-6 sm:pt-6">
            <div className="w-full rounded-[24px] border border-border bg-background px-4 py-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="ui-text m-0 font-semibold text-foreground">Members</p>
                <button
                  className="inline-flex size-9 items-center justify-center rounded-full border border-input bg-card text-foreground"
                  onClick={() => {
                    setIsMembersOpen(false);
                    setMemberSearch("");
                    setSelectedMemberIds([]);
                    setMembersError(null);
                  }}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>

              {isLoadingMembers ? (
                <p className="ui-text m-0 py-8 text-center text-muted-foreground">Loading members...</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        className="flex min-h-11 items-center justify-between rounded-[14px] border border-input bg-card px-4 py-2"
                        key={member.id}
                      >
                        <span className="ui-text text-foreground">{member.displayName}</span>
                        <span className="ui-text text-muted-foreground">
                          {member.role === "owner" ? "Owner" : "Member"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="ui-text min-h-12 w-full rounded-[16px] border border-input bg-background py-3 pr-4 pl-11 text-foreground"
                      onChange={(event) => setMemberSearch(event.target.value)}
                      placeholder="Search members"
                      value={memberSearch}
                    />
                  </div>

                  <div className="max-h-[40vh] space-y-2 overflow-y-auto">
                    {filteredCandidates.map((member) => {
                      const isSelected = selectedMemberIds.includes(member.id);
                      return (
                        <label
                          className="flex min-h-11 items-center justify-between rounded-[14px] border border-input bg-card px-4 py-2"
                          key={member.id}
                        >
                          <span className="ui-text text-foreground">{member.displayName}</span>
                          <input
                            checked={isSelected}
                            onChange={() => toggleMember(member.id)}
                            type="checkbox"
                          />
                        </label>
                      );
                    })}
                    {filteredCandidates.length === 0 ? (
                      <p className="ui-text m-0 py-6 text-center text-muted-foreground">No members found.</p>
                    ) : null}
                  </div>

                  {membersError ? (
                    <p className="ui-text m-0 rounded-[14px] border border-destructive/20 bg-destructive/8 px-4 py-3 text-destructive">
                      {membersError}
                    </p>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      className="ui-text inline-flex min-h-12 items-center justify-center rounded-[16px] bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
                      disabled={isSavingMembers || selectedMemberIds.length === 0}
                      onClick={() => void handleAddMembers()}
                      type="button"
                    >
                      {isSavingMembers ? "Adding..." : "Add members"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
