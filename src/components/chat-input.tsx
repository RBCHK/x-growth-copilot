"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import { SendHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONTENT_TYPES, type ContentType } from "@/lib/types";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  contentType: ContentType;
  onContentTypeChange: (type: ContentType) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  contentType,
  onContentTypeChange,
  onSend,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1 text-xs"
            >
              {contentType}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {CONTENT_TYPES.map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => onContentTypeChange(type)}
              >
                {type}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Paste a tweet URL or type your message…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onSend}
          disabled={disabled || !value.trim()}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
