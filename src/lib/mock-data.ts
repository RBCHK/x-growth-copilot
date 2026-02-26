import { Draft, ScheduledSlot } from "./types";

export const MOCK_DRAFTS: Draft[] = [
  {
    id: "d1",
    title: "Re: AI agents will replace SaaS",
    contentType: "Reply",
    status: "draft",
    updatedAt: new Date("2026-02-25T10:30:00-08:00"),
  },
  {
    id: "d2",
    title: "Why most AI wrappers die in 6 months",
    contentType: "Post",
    status: "draft",
    updatedAt: new Date("2026-02-25T08:15:00-08:00"),
  },
  {
    id: "d3",
    title: "Re: Indie hackers don't need VCs",
    contentType: "Reply",
    status: "packaged",
    updatedAt: new Date("2026-02-24T22:00:00-08:00"),
  },
  {
    id: "d4",
    title: "The real cost of 'free' tier users",
    contentType: "Thread",
    status: "draft",
    updatedAt: new Date("2026-02-24T15:30:00-08:00"),
  },
  {
    id: "d5",
    title: "Re: Mobile apps are dead, web wins",
    contentType: "Reply",
    status: "draft",
    updatedAt: new Date("2026-02-24T11:00:00-08:00"),
  },
];

function today(hour: number, min: number): Date {
  const d = new Date("2026-02-25T00:00:00-08:00");
  d.setHours(hour, min, 0, 0);
  return d;
}

function tomorrow(hour: number, min: number): Date {
  const d = new Date("2026-02-26T00:00:00-08:00");
  d.setHours(hour, min, 0, 0);
  return d;
}

export const MOCK_SLOTS: ScheduledSlot[] = [
  {
    id: "s1",
    date: today(9, 0),
    timeSlot: "9:00 AM",
    slotType: "Reply",
    status: "posted",
    draftId: "d-old-1",
    draftTitle: "Re: No-code is a lie",
  },
  {
    id: "s2",
    date: today(12, 0),
    timeSlot: "12:00 PM",
    slotType: "Post",
    status: "filled",
    draftId: "d3",
    draftTitle: "Re: Indie hackers don't need VCs",
  },
  {
    id: "s3",
    date: today(15, 0),
    timeSlot: "3:00 PM",
    slotType: "Reply",
    status: "empty",
  },
  {
    id: "s4",
    date: today(18, 0),
    timeSlot: "6:00 PM",
    slotType: "Reply",
    status: "empty",
  },
  {
    id: "s5",
    date: tomorrow(9, 0),
    timeSlot: "9:00 AM",
    slotType: "Post",
    status: "empty",
  },
  {
    id: "s6",
    date: tomorrow(12, 0),
    timeSlot: "12:00 PM",
    slotType: "Reply",
    status: "empty",
  },
  {
    id: "s7",
    date: tomorrow(15, 0),
    timeSlot: "3:00 PM",
    slotType: "Reply",
    status: "empty",
  },
  {
    id: "s8",
    date: tomorrow(18, 0),
    timeSlot: "6:00 PM",
    slotType: "Post",
    status: "empty",
  },
];
