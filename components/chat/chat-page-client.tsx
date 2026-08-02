"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Search, Users, X } from "lucide-react";
import type { ChatCandidateMember, ChatRoomListItem } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

type Props = {
  currentMemberId: string;
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

  const currentEasternDayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const valueEasternDayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  if (currentEasternDayKey === valueEasternDayKey) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function ChatPageClient({
  currentMemberId,
  initialRooms,
}: Props) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [candidates, setCandidates] = useState<ChatCandidateMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingRoomImageId, setIsUploadingRoomImageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const roomImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setRooms(initialRooms);
  }, [initialRooms]);

  useEffect(() => {
    const supabase = createClient();

    async function refreshRooms() {
      try {
        const response = await fetch("/api/chat/rooms", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          error?: string;
          rooms?: ChatRoomListItem[];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load chat rooms.");
        }

        setRooms(payload.rooms ?? []);
      } catch {
        // Realtime room list sync is best effort.
      }
    }

    const channel = supabase
      .channel(`chat-rooms-${currentMemberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_room_members",
          filter: `member_id=eq.${currentMemberId}`,
        },
        () => {
          void refreshRooms();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentMemberId]);

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

  async function openMemberPicker() {
    setIsMemberPickerOpen(true);
    setErrorMessage(null);

    if (candidates.length > 0 || isLoadingCandidates) {
      return;
    }

    setIsLoadingCandidates(true);

    try {
      const response = await fetch("/api/chat/candidates", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        error?: string;
        candidates?: ChatCandidateMember[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load members.");
      }

      setCandidates((payload.candidates ?? []).filter((member) => member.id !== currentMemberId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load members.");
    } finally {
      setIsLoadingCandidates(false);
    }
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create chat room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoomImageChange(roomId: string, file: File | null) {
    if (!file) {
      return;
    }

    setIsUploadingRoomImageId(roomId);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/chat/rooms/${roomId}/image`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        imageUrl?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update chat image.");
      }

      setRooms((current) =>
        current.map((room) =>
          room.id === roomId
            ? {
                ...room,
                imageUrl: payload.imageUrl ?? null,
              }
            : room,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update chat image.");
    } finally {
      setIsUploadingRoomImageId(null);
      const input = roomImageInputRefs.current[roomId];
      if (input) {
        input.value = "";
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-2 bg-transparent px-0 text-base font-semibold text-foreground"
          href="/home"
        >
          <ChevronLeft className="size-4" />
          Home
        </Link>
        <button
          className="ui-text inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent bg-primary px-4 font-semibold text-primary-foreground shadow-none transition hover:bg-primary"
          onClick={() => setIsComposerOpen((current) => !current)}
          type="button"
        >
          <span className="relative -top-px text-[1.2rem] leading-none">+</span>
          New Chat
        </button>
      </div>

      {isComposerOpen ? (
        <form className="event-form-input rounded-[18px] border border-border/80 bg-white px-4 py-4" onSubmit={handleCreateRoom}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                className="event-form-input ui-text inline-flex min-h-12 items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 font-semibold text-foreground transition hover:bg-white"
                onClick={closeComposer}
                type="button"
              >
                Cancel
              </button>
              <button
                className="ui-text inline-flex min-h-12 items-center justify-center rounded-[16px] bg-primary px-5 font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>

            <div>
              <p className="ui-text m-0 mb-2 font-semibold text-foreground">Room Name</p>
              <input
                className="event-form-input ui-text min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
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
                  className="inline-flex size-8 items-center justify-center rounded-full border border-transparent bg-primary text-primary-foreground transition hover:bg-primary"
                  onClick={() => void openMemberPicker()}
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
                        className="ui-text inline-flex min-h-9 items-center gap-2 rounded-full border border-transparent bg-primary px-3 text-primary-foreground"
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
                className="inline-flex size-9 items-center justify-center rounded-full border border-transparent bg-primary text-primary-foreground"
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
              {isLoadingCandidates ? (
                <p className="ui-text m-0 py-6 text-center text-muted-foreground">Loading members...</p>
              ) : null}
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
              {!isLoadingCandidates && filteredCandidates.length === 0 ? (
                <p className="ui-text m-0 py-6 text-center text-muted-foreground">No members found.</p>
              ) : null}
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {rooms.length === 0 ? (
        <div className="home-surface rounded-[18px] border border-border px-4 py-5">
          <p className="ui-text m-0 text-center text-muted-foreground">No chat rooms yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <Link className="block w-full py-2 transition" href={`/chat/${room.id}`} key={room.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="shrink-0">
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] ?? null;
                        void handleRoomImageChange(room.id, nextFile);
                      }}
                      ref={(node) => {
                        roomImageInputRefs.current[room.id] = node;
                      }}
                      type="file"
                    />
                    <button
                      className="home-surface relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        roomImageInputRefs.current[room.id]?.click();
                      }}
                      type="button"
                    >
                      {room.imageUrl ? (
                        <img
                          alt={`${room.title} room`}
                          className="h-full w-full object-cover"
                          src={room.imageUrl}
                        />
                      ) : (
                        <Users className="size-5 text-muted-foreground" />
                      )}
                      {isUploadingRoomImageId === room.id ? (
                        <span className="absolute inset-0 bg-black/20" />
                      ) : null}
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="ui-text m-0 truncate text-[1.22em] font-semibold text-foreground">{room.title}</p>
                      {room.unreadCount > 0 ? (
                        <span className="ui-text inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.72rem] font-semibold leading-none text-white">
                          {room.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    {room.description ? (
                      <p className="ui-text mt-2 mb-0 line-clamp-2 text-muted-foreground">{room.description}</p>
                    ) : null}
                    <p className="ui-text mt-2 mb-0 truncate text-muted-foreground">
                      {room.lastMessageText ?? `${room.memberCount} members`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <span className="ui-text text-right text-muted-foreground">
                    {formatChatTimestamp(room.lastMessageAt)}
                  </span>
                </div>
              </div>
              <div className="mt-4 border-b border-border/70" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
