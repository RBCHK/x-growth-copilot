"use client";

import { useRef, useState, useEffect } from "react";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { TextSelectionPopup } from "@/components/text-selection-popup";
import { useConversation } from "@/contexts/conversation-context";

export function ChatArea() {
  const {
    messages,
    input,
    contentType,
    isLoading,
    error,
    setInput,
    setContentType,
    sendMessage,
  } = useConversation();

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [inputHeight, setInputHeight] = useState(0);

  useEffect(() => {
    const el = inputWrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setInputHeight(el.offsetHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <ChatMessages messages={messages} inputHeight={inputHeight} />
      <div ref={inputWrapperRef} className="absolute bottom-0 left-0 right-0 z-10">
        <div className="pointer-events-none h-8 bg-linear-to-t from-background to-transparent" />
        {error && (
          <div className="mx-auto w-full max-w-2xl px-4 pb-2">
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error.message || "Ошибка при обращении к модели"}
            </p>
          </div>
        )}
        <ChatInput
          value={input}
          onChange={setInput}
          contentType={contentType}
          onContentTypeChange={setContentType}
          onSend={sendMessage}
          disabled={isLoading}
        />
      </div>
      <TextSelectionPopup />
    </div>
  );
}
