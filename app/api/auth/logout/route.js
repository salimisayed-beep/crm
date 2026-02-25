import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[logout] Error:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
