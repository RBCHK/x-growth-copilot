"use client";

import { useRef, useCallback, useLayoutEffect, type KeyboardEvent } from "react";
import { SendHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONTENT_TYPES, type ContentType } from "@/lib/types";

const MIN_HEIGHT_PX = 72; /* ~3 lines with text-sm leading-relaxed */
const MAX_HEIGHT_PX = 200;

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
    const h = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), MAX_HEIGHT_PX);
    el.style.height = `${h}px`;
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  }

  return (
    <div className="bg-background px-4 pt-4 pb-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-border bg-card transition-colors duration-150 focus-within:border-white/8">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Paste a tweet URL or type your message…"
            rows={1}
            disabled={disabled}
            className="min-h-[72px] w-full max-h-[200px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-left text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-white/6 hover:text-foreground"
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

            <Button
              size="icon"
              className="h-8 w-8 shrink-0 rounded-md"
              onClick={onSend}
              disabled={disabled || !value.trim()}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
