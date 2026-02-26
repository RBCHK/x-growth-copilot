import { NextRequest, NextResponse } from "next/server";

function getAppPassword(): string {
  const pw = process.env.APP_PASSWORD;
  if (!pw) {
    throw new Error(
      "APP_PASSWORD environment variable is not set. Add it to .env.local",
    );
  }
  return pw;
}

export async function POST(req: NextRequest) {
  const APP_PASSWORD = getAppPassword();
  const { password } = await req.json();

  if (password !== APP_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
