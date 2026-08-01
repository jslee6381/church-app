"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, SendHorizonal, Users } from "lucide-react";
import type { ChatRoomDetail } from "@/lib/chat";

type Props = {
  room: ChatRoomDetail;
};

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
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="ui-text inline-flex min-h-11 items-center gap-2 bg-transparent px-0 font-semibold text-foreground"
            href="/chat"
          >
            <ChevronLeft className="size-4" />
            Chat
          </Link>
          <div className="mt-3">
            <h1 className="m-0 font-sans text-[1.55rem] leading-tight text-foreground">{room.title}</h1>
            {room.description ? (
              <p className="ui-text mt-2 mb-0 text-muted-foreground">{room.description}</p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 pt-2">
          <div className="ui-text inline-flex items-center gap-2 rounded-[14px] border border-input bg-card px-3 py-2 text-muted-foreground">
            <Users className="size-4" />
            {room.memberCount}
          </div>
        </div>
      </header>

      <section className="home-surface rounded-[20px] border border-border px-4 py-4">
        <div className="space-y-3">
          {room.messages.length === 0 ? (
            <p className="ui-text m-0 text-center text-muted-foreground">No messages yet.</p>
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
                      : "bg-background text-foreground"
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
        </div>
      </section>

      <section className="home-surface rounded-[20px] border border-border px-4 py-4">
        <form className="space-y-3" onSubmit={handleSendMessage}>
          <textarea
            className="ui-text min-h-[92px] w-full resize-none rounded-[16px] border border-input bg-background px-4 py-3 text-foreground"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write a message..."
            value={message}
          />
          {errorMessage ? (
            <p className="ui-text m-0 rounded-[14px] border border-destructive/20 bg-destructive/8 px-4 py-3 text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              className="ui-text inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-primary px-4 font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-60"
              disabled={isSubmitting || !message.trim()}
              type="submit"
            >
              <SendHorizonal className="size-4" />
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
