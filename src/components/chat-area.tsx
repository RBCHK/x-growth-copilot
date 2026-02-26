"use client";

import { useState, useCallback } from "react";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import type { ContentType, Message } from "@/lib/types";

interface ChatAreaProps {
  conversationId: string;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [contentType, setContentType] = useState<ContentType>("Reply");

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `${conversationId}-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date(),
    };

    const assistantMsg: Message = {
      id: `${conversationId}-${Date.now()}-a`,
      role: "assistant",
      content: "Assistant response will appear here — AI pipeline coming in Sprint 3.",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
  }, [input, conversationId]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatMessages messages={messages} />
      <ChatInput
        value={input}
        onChange={setInput}
        contentType={contentType}
        onContentTypeChange={setContentType}
        onSend={handleSend}
      />
    </div>
  );
}
