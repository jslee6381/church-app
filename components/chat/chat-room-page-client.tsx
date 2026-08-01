"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, SendHorizonal, Users } from "lucide-react";
import type { ChatRoomDetail } from "@/lib/chat";

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
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ChatRoomPageClient({ room }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [message]);

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
          <h1 className="m-0 truncate font-sans text-[1.05rem] leading-tight font-semibold text-foreground">
            {room.title}
          </h1>
        </div>
        <div className="flex w-11 shrink-0 justify-end">
          <div className="ui-text inline-flex items-center gap-2 rounded-[14px] border border-input bg-card px-3 py-2 text-muted-foreground">
            <Users className="size-4" />
            {room.memberCount}
          </div>
        </div>
      </header>

      {room.description ? (
        <p className="ui-text m-0 text-center text-muted-foreground">{room.description}</p>
      ) : null}

      <section className="space-y-3">
        {room.messages.length === 0 ? (
          <p className="ui-text m-0 py-10 text-center text-muted-foreground">No messages yet.</p>
        ) : (
          room.messages.map((message) => (
            <div
              className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
              key={message.id}
            >
              <div
                className={`max-w-[85%] rounded-[18px] px-4 py-3 ${
                  message.isOwnMessage
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {!message.isOwnMessage ? (
                  <p className="ui-text m-0 mb-1 font-semibold text-current">{message.senderName}</p>
                ) : null}
                <p className="ui-text m-0 whitespace-pre-wrap break-words text-current">{message.body}</p>
                <p className="ui-text mt-2 mb-0 text-[0.72rem] opacity-70">
                  {formatMessageTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
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
    </div>
  );
}
