"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { ContentType, Message, Note } from "@/lib/types";
import { addNote as addNoteAction, removeNote as removeNoteAction, clearNotes as clearNotesAction } from "@/app/actions/notes";
import { addMessage } from "@/app/actions/conversations";

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
  initialData,
  children,
}: {
  conversationId: string;
  initialData?: { messages: Message[]; notes: Note[]; contentType: ContentType; title?: string };
  children: ReactNode;
}) {
  const [messages, setMessages] = useState<Message[]>(initialData?.messages ?? []);
  const [notes, setNotes] = useState<Note[]>(initialData?.notes ?? []);
  const [contentType, setContentType] = useState<ContentType>(initialData?.contentType ?? "Reply");
  const [input, setInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    const msgs = (initialData?.messages ?? []).map((m) => ({
      ...m,
      createdAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt as string),
    }));
    const nts = (initialData?.notes ?? []).map((n) => ({
      ...n,
      createdAt: n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt as string),
    }));
    setMessages(msgs);
    setNotes(nts);
    setContentType(initialData?.contentType ?? "Reply");
  }, [conversationId, initialData]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    await addMessage(conversationId, "user", text);
    await addMessage(conversationId, "assistant", "Assistant response will appear here — AI pipeline coming in Sprint 3.");

    const assistantMsg: Message = {
      id: `temp-${Date.now()}-a`,
      role: "assistant",
      content: "Assistant response will appear here — AI pipeline coming in Sprint 3.",
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    router.refresh();
  }, [input, conversationId, router]);

  const addNote = useCallback(
    async (content: string) => {
      const tempId = `n-${Date.now()}`;
      setNotes((prev) => [...prev, { id: tempId, content, createdAt: new Date() }]);
      try {
        const created = await addNoteAction(conversationId, content);
        setNotes((prev) => prev.map((n) => (n.id === tempId ? created : n)));
      } catch {
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
      }
      router.refresh();
    },
    [conversationId, router]
  );

  const removeNote = useCallback(
    async (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      try {
        await removeNoteAction(id, conversationId);
      } catch {
        router.refresh();
      }
      router.refresh();
    },
    [conversationId, router]
  );

  const clearNotes = useCallback(async () => {
    setNotes([]);
    await clearNotesAction(conversationId);
    router.refresh();
  }, [conversationId, router]);

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
