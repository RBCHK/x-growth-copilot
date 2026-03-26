import { prisma } from "@/lib/prisma";
import { getXApiTokenForUserInternal } from "@/app/actions/x-token";
import { postTweet } from "@/lib/x-api";
import { slotToUtcDate } from "@/lib/date-utils";
import { withCronLogging } from "@/lib/cron-helpers";

export const maxDuration = 60;

export const GET = withCronLogging("auto-publish", async () => {
  const now = new Date();

  // Fetch all SCHEDULED slots with their user's timezone
  const slots = await prisma.scheduledSlot.findMany({
    where: { status: "SCHEDULED" },
    include: { user: { select: { id: true, timezone: true } } },
  });

  // Filter to slots whose scheduled time has passed
  const dueSlots = slots.filter((s) => slotToUtcDate(s.date, s.timeSlot, s.user.timezone) <= now);

  if (dueSlots.length === 0) {
    return { status: "SUCCESS", data: { published: 0, errors: 0 } };
  }

  let published = 0;
  let errors = 0;
  const details: { slotId: string; userId: string; platform?: string; error?: string }[] = [];

  for (const slot of dueSlots) {
    const { user } = slot;

    if (!slot.content?.trim()) {
      // No content — skip (shouldn't happen but be safe)
      details.push({ slotId: slot.id, userId: user.id, error: "Empty content" });
      errors++;
      continue;
    }

    // --- Post to X ---
    try {
      const credentials = await getXApiTokenForUserInternal(user.id);
      if (!credentials) {
        details.push({ slotId: slot.id, userId: user.id, error: "No X credentials" });
        errors++;
        continue;
      }

      await postTweet(credentials, slot.content, {
        callerJob: "auto-publish",
        userId: user.id,
      });

      // Mark as POSTED
      const postedAt = new Date();
      await prisma.scheduledSlot.update({
        where: { id: slot.id },
        data: { status: "POSTED", postedAt },
      });

      if (slot.conversationId) {
        await prisma.conversation.update({
          where: { id: slot.conversationId },
          data: { status: "POSTED" },
        });
      }

      published++;
      details.push({ slotId: slot.id, userId: user.id, platform: "X" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      details.push({ slotId: slot.id, userId: user.id, error: msg });
      errors++;
    }
  }

  return {
    status: errors > 0 && published > 0 ? "PARTIAL" : errors > 0 ? "FAILURE" : "SUCCESS",
    data: { published, errors, due: dueSlots.length, details },
  };
});
