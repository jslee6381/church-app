"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search, Users, X } from "lucide-react";
import type { ChatCandidateMember, ChatRoomListItem } from "@/lib/chat";

type Props = {
  currentMemberId: string;
  initialCandidates: ChatCandidateMember[];
  initialRooms: ChatRoomListItem[];
};

const TITLE_LIMIT = 60;

function formatChatTimestamp(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ChatPageClient({
  currentMemberId,
  initialCandidates,
  initialRooms,
}: Props) {
  const router = useRouter();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const candidates = useMemo(
    () => initialCandidates.filter((member) => member.id !== currentMemberId),
    [currentMemberId, initialCandidates],
  );

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = memberSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return candidates;
    }

    return candidates.filter((member) =>
      member.displayName.toLowerCase().includes(normalizedQuery),
    );
  }, [candidates, memberSearch]);

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((value) => value !== memberId)
        : [...current, memberId],
    );
  }

  function closeComposer() {
    setIsComposerOpen(false);
    setTitle("");
    setSelectedMemberIds([]);
    setIsMemberPickerOpen(false);
    setMemberSearch("");
    setErrorMessage(null);
  }

  async function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title,
          memberIds: selectedMemberIds,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        room?: { id: string };
      };

      if (!response.ok || !payload.room) {
        throw new Error(payload.error ?? "Unable to create chat room.");
      }

      setTitle("");
      setSelectedMemberIds([]);
      setIsComposerOpen(false);
      setIsMemberPickerOpen(false);
      setMemberSearch("");
      router.push(`/chat/${payload.room.id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create chat room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="mb-1 flex min-h-11 items-center justify-between gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-2 bg-transparent px-0 text-base font-semibold text-foreground"
          href="/home"
        >
          <ChevronLeft className="size-4" />
          Home
        </Link>
        <button
          className="ui-text inline-flex min-h-11 items-center gap-2 border-0 bg-transparent px-0 font-semibold text-foreground shadow-none transition hover:bg-transparent"
          onClick={() => setIsComposerOpen((current) => !current)}
          type="button"
        >
          <span className="text-[1.2rem] leading-none">+</span>
          New Chat
        </button>
      </div>

      {isComposerOpen ? (
        <form className="home-surface rounded-[18px] border border-border px-4 py-4" onSubmit={handleCreateRoom}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                className="ui-text inline-flex min-h-11 items-center justify-center rounded-full border border-input bg-background px-4 font-semibold text-foreground transition hover:bg-background"
                onClick={closeComposer}
                type="button"
              >
                Cancel
              </button>
              <button
                className="ui-text inline-flex min-h-11 items-center justify-center rounded-full border border-input bg-background px-4 font-semibold text-foreground transition hover:bg-background disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>

            <div>
              <p className="ui-text m-0 mb-2 font-semibold text-foreground">Room Name</p>
              <input
                className="ui-text min-h-12 w-full rounded-[16px] border border-input bg-background px-4 py-3 text-foreground"
                maxLength={TITLE_LIMIT}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Sunday Leaders"
                value={title}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="ui-text m-0 font-semibold text-foreground">Members</p>
                <button
                  className="inline-flex size-8 items-center justify-center rounded-full border border-input bg-background text-foreground transition hover:bg-background"
                  onClick={() => setIsMemberPickerOpen(true)}
                  type="button"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {selectedMemberIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidates
                    .filter((member) => selectedMemberIds.includes(member.id))
                    .map((member) => (
                      <button
                        className="ui-text inline-flex min-h-9 items-center gap-2 rounded-full border border-input bg-background px-3 text-foreground"
                        key={member.id}
                        onClick={() => toggleMember(member.id)}
                        type="button"
                      >
                        <span>{member.displayName}</span>
                        <X className="size-3.5" />
                      </button>
                    ))}
                </div>
              ) : (
                <p className="ui-text m-0 text-muted-foreground">No members selected.</p>
              )}
            </div>

            {errorMessage ? (
              <p className="ui-text m-0 rounded-[14px] border border-destructive/20 bg-destructive/8 px-4 py-3 text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </form>
      ) : null}

      {isMemberPickerOpen ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/50">
          <div className="mx-auto flex min-h-full w-full max-w-[560px] items-start justify-center px-4 pt-5 pb-6 sm:pt-6">
            <div className="w-full rounded-[24px] border border-border bg-background px-4 py-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="ui-text m-0 font-semibold text-foreground">Members</p>
              <button
                className="inline-flex size-9 items-center justify-center rounded-full border border-input bg-background text-foreground"
                onClick={() => {
                  setIsMemberPickerOpen(false);
                  setMemberSearch("");
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="ui-text min-h-12 w-full rounded-[16px] border border-input bg-background py-3 pr-4 pl-11 text-foreground"
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search members"
                value={memberSearch}
              />
            </div>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {filteredCandidates.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <label
                    className="flex min-h-11 items-center justify-between rounded-[14px] border border-input bg-background px-4 py-2"
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
            </div>
          </div>
        </div>
      ) : null}

      {initialRooms.length === 0 ? (
        <div className="home-surface rounded-[18px] border border-border px-4 py-5">
          <p className="ui-text m-0 text-center text-muted-foreground">No chat rooms yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialRooms.map((room) => (
            <Link
              className="home-surface block rounded-[18px] border border-border px-4 py-4 transition hover:bg-card"
              href={`/chat/${room.id}`}
              key={room.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 shrink-0 text-muted-foreground" />
                    <p className="ui-text m-0 truncate font-semibold text-foreground">{room.title}</p>
                  </div>
                  {room.description ? (
                    <p className="ui-text mt-2 mb-0 line-clamp-2 text-muted-foreground">{room.description}</p>
                  ) : null}
                  <p className="ui-text mt-2 mb-0 truncate text-muted-foreground">
                    {room.lastMessageText ?? `${room.memberCount} members`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="ui-text text-right text-muted-foreground">
                    {formatChatTimestamp(room.lastMessageAt)}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
