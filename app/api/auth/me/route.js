import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.id,
        username: session.username,
        role: session.role,
      },
    });
  } catch (err) {
    console.error("[me] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to read session" },
      { status: 401 },
    );
  }
}
