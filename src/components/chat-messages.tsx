"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import type { Message } from "@/lib/types";

interface ChatMessagesProps {
  messages: Message[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevLengthRef = useRef(messages.length);

  // Отслеживаем, прокрутил ли пользователь вверх
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 80;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const lastContent = messages[messages.length - 1]?.content ?? "";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isNewMessage = messages.length !== prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (isNewMessage) {
      // Новое сообщение — плавный скролл и сбрасываем флаг
      shouldAutoScrollRef.current = true;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else if (shouldAutoScrollRef.current) {
      // Стриминг — мгновенный скролл, если не прокрутили вверх
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, lastContent]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-base leading-relaxed text-muted-foreground">
          Start a conversation — paste a tweet or describe your topic
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
      <div data-chat-messages className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-6">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div className="h-56 shrink-0" />
      </div>
    </div>
  );
}
