import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns the internal DB userId for the currently authenticated Clerk user.
 * Throws if not authenticated or user not found in DB.
 */
export async function requireUserId(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found in database");

  return user.id;
}
