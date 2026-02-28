"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import type { Message } from "@/lib/types";

interface ChatMessagesProps {
  messages: Message[];
}

const NEAR_BOTTOM = 64; // px
const SCROLL_TOP_OFFSET = 24; // px = pt-6

export function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);

  const userCount = messages.filter((m) => m.role === "user").length;
  const prevUserCount = useRef(userCount);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const spacerHeight = () => spacerRef.current?.offsetHeight ?? 0;

    // Расстояние от конца контента (без spacer) до нижнего края viewport
    const distFromContentBottom = () =>
      el.scrollHeight - spacerHeight() - el.scrollTop - el.clientHeight;

    const onScroll = () => {
      stickyRef.current = distFromContentBottom() < NEAR_BOTTOM;
    };

    // Wheel вверх — сразу отключаем sticky (без ожидания scroll-события)
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) stickyRef.current = false;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const spacer = spacerRef.current;
    if (!el) return;

    if (userCount > prevUserCount.current) {
      prevUserCount.current = userCount;
      stickyRef.current = true;

      // Spacer создаёт место для скролла — без него браузер не может
      // поднять сообщение к верху, если контента меньше чем высота экрана
      if (spacer) spacer.style.height = `${el.clientHeight}px`;

      requestAnimationFrame(() => {
        const userMsgs = el.querySelectorAll('[data-role="user"]');
        const lastMsg = userMsgs[userMsgs.length - 1] as HTMLElement | undefined;
        if (lastMsg) {
          const offset =
            lastMsg.getBoundingClientRect().top -
            el.getBoundingClientRect().top;
          el.scrollTop = el.scrollTop + offset - SCROLL_TOP_OFFSET;
        }
      });
      return;
    }

    if (stickyRef.current) {
      // Следим за ростом контента: скроллим вниз только если контент
      // вырос за нижний край viewport — не прыгаем к концу
      const spacerH = spacer?.offsetHeight ?? 0;
      const contentBottom = el.scrollHeight - spacerH;
      const viewportBottom = el.scrollTop + el.clientHeight;
      if (contentBottom > viewportBottom) {
        el.scrollTop = contentBottom - el.clientHeight;
      }
    }
  }, [messages, userCount]);

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
      <div data-chat-messages className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={spacerRef} className="shrink-0" />
      </div>
    </div>
  );
}
