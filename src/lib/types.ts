export const CONTENT_TYPES = ["Reply", "Post", "Thread", "Article"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const DRAFT_STATUSES = ["draft", "packaged", "scheduled", "posted"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const SLOT_STATUSES = ["empty", "filled", "posted"] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const SLOT_TYPES = ["Reply", "Post"] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

export interface Draft {
  id: string;
  title: string;
  contentType: ContentType;
  status: DraftStatus;
  updatedAt: Date;
}

export interface ScheduledSlot {
  id: string;
  date: Date;
  timeSlot: string;
  slotType: SlotType;
  status: SlotStatus;
  draftId?: string;
  draftTitle?: string;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}
