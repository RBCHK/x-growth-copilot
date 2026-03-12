import { fetchUserData, fetchCurrentUserId, fetchUserTweets } from '@/lib/x-api';
import { NextResponse } from 'next/server';

// Temporary test endpoint — remove after verifying API works
export async function GET() {
  try {
    const [user, userId] = await Promise.all([fetchUserData(), fetchCurrentUserId()]);
    const tweets = await fetchUserTweets(userId, 5);
    return NextResponse.json({ ok: true, user, userId, tweets });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
