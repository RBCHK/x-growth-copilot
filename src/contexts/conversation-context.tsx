"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { ContentType, Message, Note } from "@/lib/types";

interface ConversationContextValue {
  conversationId: string;
  messages: Message[];
  notes: Note[];
  contentType: ContentType;
  input: string;

  setInput: (value: string) => void;
  setContentType: (type: ContentType) => void;
  sendMessage: () => void;
  addNote: (content: string) => void;
  removeNote: (id: string) => void;
  clearNotes: () => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error("useConversation must be used within ConversationProvider");
  }
  return ctx;
}

export function ConversationProvider({
  conversationId,
  children,
}: {
  conversationId: string;
  children: ReactNode;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contentType, setContentType] = useState<ContentType>("Reply");
  const [input, setInput] = useState("");

  const sendMessage = useCallback(() => {
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
      content:
        "Assistant response will appear here — AI pipeline coming in Sprint 3.",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
  }, [input, conversationId]);

  const addNote = useCallback((content: string) => {
    const note: Note = {
      id: `n-${Date.now()}`,
      content,
      createdAt: new Date(),
    };
    setNotes((prev) => [...prev, note]);
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotes = useCallback(() => {
    setNotes([]);
  }, []);

  return (
    <ConversationContext.Provider
      value={{
        conversationId,
        messages,
        notes,
        contentType,
        input,
        setInput,
        setContentType,
        sendMessage,
        addNote,
        removeNote,
        clearNotes,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}
