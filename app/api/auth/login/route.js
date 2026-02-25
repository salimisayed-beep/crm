import { NextResponse } from "next/server";
import { getDb, first } from "@/lib/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { signSession, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { username, password } = body;

    if (!username || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const db = await getDb();

    const rs = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [username.trim().toLowerCase()],
    });
    const user = first(rs);

    // Constant-time path to prevent user enumeration via timing
    const dummyHash =
      "$2b$10$invalidhashfortimingprotectiononly00000000000000000";
    const passwordToCheck = user ? user.password : dummyHash;
    const isMatch = await bcrypt.compare(password, passwordToCheck);

    if (!user || !isMatch) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const token = await signSession({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("[login] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected server error occurred. Please try again." },
      { status: 500 },
    );
  }
}
