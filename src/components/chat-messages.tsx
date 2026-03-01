"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import { useConversation } from "@/contexts/conversation-context";

const NEAR_BOTTOM = 64; // px
const SCROLL_TOP_OFFSET = 24; // px = pt-6

export function ChatMessages() {
  const { messages, isLoading } = useConversation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);
  const wasLoadingRef = useRef(false);

  const userCount = messages.filter((m) => m.role === "user").length;
  const prevUserCount = useRef(userCount);

  // Сбрасываем spacer когда стриминг заканчивается.
  // Если sticky уже убрал spacer во время генерации — здесь ничего не происходит.
  // Если контент был короче экрана (sticky не срабатывал) — плавно докручиваем
  // к концу контента, потом убираем spacer (чтобы не было резкого прыжка).
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      const el = scrollRef.current;
      const spacer = spacerRef.current;
      if (el && spacer && spacer.offsetHeight > 0) {
        const spacerH = spacer.offsetHeight;
        const newMaxScrollTop = Math.max(0, el.scrollHeight - spacerH - el.clientHeight);
        if (el.scrollTop <= newMaxScrollTop) {
          // Прыжка не будет — убираем сразу
          spacer.style.height = "0";
        } else {
          // scrollTop будет зажат — сначала плавно докручиваем, потом убираем spacer
          el.scrollTo({ top: newMaxScrollTop, behavior: "smooth" });
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            spacer.style.height = "0";
          };
          const timer = setTimeout(finish, 400);
          el.addEventListener("scrollend", () => { clearTimeout(timer); finish(); }, { once: true });
        }
      }
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

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
        // scrollTop теперь равен newMaxScrollTop без spacer → убираем безопасно
        if (spacer && spacer.offsetHeight > 0) spacer.style.height = "0";
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
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
        <div data-chat-messages className="mx-auto flex w-full max-w-chat flex-col gap-4 px-4 pt-6 pb-6">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={spacerRef} className="shrink-0" />
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-[18px] bg-linear-to-b from-background to-transparent"
        aria-hidden
      />
    </div>
  );
}
