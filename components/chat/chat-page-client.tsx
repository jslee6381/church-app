"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, MessageSquarePlus, Users } from "lucide-react";
import type { ChatCandidateMember, ChatRoomListItem } from "@/lib/chat";

type Props = {
  currentMemberId: string;
  initialCandidates: ChatCandidateMember[];
  initialRooms: ChatRoomListItem[];
};

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 180;

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
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const candidates = useMemo(
    () => initialCandidates.filter((member) => member.id !== currentMemberId),
    [currentMemberId, initialCandidates],
  );

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((value) => value !== memberId)
        : [...current, memberId],
    );
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
          description,
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
      setDescription("");
      setSelectedMemberIds([]);
      setIsComposerOpen(false);
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
      <div className="flex justify-end">
        <button
          className="ui-text inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-input bg-card px-4 font-semibold text-foreground transition hover:bg-card"
          onClick={() => setIsComposerOpen((current) => !current)}
          type="button"
        >
          <MessageSquarePlus className="size-4" />
          New Room
        </button>
      </div>

      {isComposerOpen ? (
        <form className="home-surface rounded-[18px] border border-border px-4 py-4" onSubmit={handleCreateRoom}>
          <div className="space-y-4">
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
              <p className="ui-text m-0 mb-2 font-semibold text-foreground">Description</p>
              <textarea
                className="ui-text min-h-[92px] w-full resize-none rounded-[16px] border border-input bg-background px-4 py-3 text-foreground"
                maxLength={DESCRIPTION_LIMIT}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional"
                value={description}
              />
            </div>

            <div>
              <p className="ui-text m-0 mb-2 font-semibold text-foreground">Members</p>
              <div className="space-y-2">
                {candidates.map((member) => {
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
              </div>
            </div>

            {errorMessage ? (
              <p className="ui-text m-0 rounded-[14px] border border-destructive/20 bg-destructive/8 px-4 py-3 text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                className="ui-text inline-flex min-h-11 items-center justify-center rounded-[14px] bg-primary px-4 font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </form>
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
