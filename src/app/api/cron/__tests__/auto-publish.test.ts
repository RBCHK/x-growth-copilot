import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────

const CRON_SECRET = "test-secret";
process.env.CRON_SECRET = CRON_SECRET;

const mockPostTweet = vi.fn();
const mockGetXApiToken = vi.fn();
const mockSlotToUtcDate = vi.fn();
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn((fn: () => Promise<void>) => fn()) };
});

vi.mock("@/lib/x-api", () => ({ postTweet: mockPostTweet }));
vi.mock("@/app/actions/x-token", () => ({
  getXApiTokenForUserInternal: mockGetXApiToken,
}));
vi.mock("@/lib/date-utils", () => ({ slotToUtcDate: mockSlotToUtcDate }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const prismaMock = {
  scheduledSlot: {
    findMany: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  conversation: {
    update: vi.fn().mockResolvedValue({}),
  },
  cronJobRun: {
    create: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/generated/prisma", () => ({}));

// ─── Helpers ─────────────────────────────────────────────

function makeRequest(token = CRON_SECRET) {
  return new NextRequest("http://localhost/api/cron/auto-publish", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

const PAST = new Date(Date.now() - 60_000); // 1 minute ago
const FUTURE = new Date(Date.now() + 60_000); // 1 minute ahead

function makeSlot(
  overrides: Partial<{
    id: string;
    content: string;
    conversationId: string | null;
    scheduledUtc: Date;
  }> = {}
) {
  const slot = {
    id: overrides.id ?? "slot-1",
    content: overrides.content ?? "Hello world",
    conversationId: overrides.conversationId ?? null,
    date: new Date("2026-01-01T00:00:00.000Z"),
    timeSlot: "8:00 AM",
    user: { id: "user-1", timezone: "UTC" },
  };
  mockSlotToUtcDate.mockReturnValueOnce(overrides.scheduledUtc ?? PAST);
  return slot;
}

// ─── Tests ───────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.scheduledSlot.findMany.mockResolvedValue([]);
  mockGetXApiToken.mockResolvedValue({ accessToken: "token-123" });
  mockPostTweet.mockResolvedValue({
    tweetId: "tweet-1",
    tweetUrl: "https://x.com/i/web/status/tweet-1",
  });
});

describe("GET /api/cron/auto-publish — auth", () => {
  it("returns 401 with wrong token", async () => {
    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with correct token", async () => {
    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });
});

describe("GET /api/cron/auto-publish — no due slots", () => {
  it("returns published: 0 and skips logging when no slots are due", async () => {
    const slot = makeSlot({ scheduledUtc: FUTURE });
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot]);

    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body).toEqual({ ok: true, published: 0 });
    expect(mockPostTweet).not.toHaveBeenCalled();
    expect(prismaMock.cronJobRun.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/auto-publish — publishing", () => {
  it("publishes due slot and marks it POSTED", async () => {
    const slot = makeSlot({ id: "slot-1", conversationId: "conv-1" });
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot]);

    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockPostTweet).toHaveBeenCalledWith(
      { accessToken: "token-123" },
      "Hello world",
      expect.objectContaining({ callerJob: "auto-publish", userId: "user-1" })
    );
    expect(prismaMock.scheduledSlot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "slot-1" },
        data: expect.objectContaining({ status: "POSTED" }),
      })
    );
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "conv-1" }, data: { status: "POSTED" } })
    );
    expect(body.published).toBe(1);
    expect(body.status).toBe("SUCCESS");
  });

  it("skips slot without content", async () => {
    const slot = makeSlot({ content: "" });
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot]);

    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockPostTweet).not.toHaveBeenCalled();
    expect(body.errors).toBe(1);
    expect(body.status).toBe("FAILURE");
  });

  it("records error when X credentials missing", async () => {
    mockGetXApiToken.mockResolvedValueOnce(null);
    const slot = makeSlot();
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot]);

    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockPostTweet).not.toHaveBeenCalled();
    expect(body.errors).toBe(1);
    expect(body.status).toBe("FAILURE");
  });

  it("returns PARTIAL when some slots publish and some fail", async () => {
    const slot1 = makeSlot({ id: "slot-1" });
    const slot2 = makeSlot({ id: "slot-2" });
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot1, slot2]);
    mockGetXApiToken.mockResolvedValueOnce({ accessToken: "token-1" }).mockResolvedValueOnce(null); // second slot has no credentials

    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.published).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.status).toBe("PARTIAL");
  });

  it("does not update conversation when slot has no conversationId", async () => {
    const slot = makeSlot({ conversationId: null });
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot]);

    const { GET } = await import("../auto-publish/route");
    await GET(makeRequest());

    expect(prismaMock.conversation.update).not.toHaveBeenCalled();
  });

  it("logs CronJobRun when there is actual work", async () => {
    const slot = makeSlot();
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot]);

    const { GET } = await import("../auto-publish/route");
    await GET(makeRequest());

    expect(prismaMock.cronJobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jobName: "auto-publish", status: "SUCCESS" }),
      })
    );
  });

  it("continues processing remaining slots when one throws", async () => {
    const slot1 = makeSlot({ id: "slot-1" });
    const slot2 = makeSlot({ id: "slot-2" });
    prismaMock.scheduledSlot.findMany.mockResolvedValue([slot1, slot2]);
    mockPostTweet
      .mockRejectedValueOnce(new Error("X API error"))
      .mockResolvedValueOnce({ tweetId: "t2", tweetUrl: "https://x.com/t2" });

    const { GET } = await import("../auto-publish/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.published).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.status).toBe("PARTIAL");
  });
});
