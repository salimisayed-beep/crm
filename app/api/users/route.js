import { NextResponse } from "next/server";
import { getDb, all } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/users - list all users (admin only)
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can manage users" },
      { status: 403 },
    );

  try {
    const db = await getDb();
    const rs = await db.execute({
      sql: "SELECT id, username, role, created_at FROM users ORDER BY id ASC",
      args: [],
    });
    return NextResponse.json({ users: all(rs) });
  } catch (err) {
    console.error("[users GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

// POST /api/users - create a new user (admin only)
export async function POST(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can create users" },
      { status: 403 },
    );

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { username, password, role } = body;

    if (!username || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const validRoles = ["admin", "manager", "editor", "viewer"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role — must be admin, manager, editor, or viewer" },
        { status: 400 },
      );
    }

    const db = await getDb();

    const existingRs = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username.trim().toLowerCase()],
    });

    if (existingRs.rows.length > 0) {
      return NextResponse.json(
        { error: "A user with that username already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertRs = await db.execute({
      sql: "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      args: [username.trim().toLowerCase(), hashedPassword, role || "viewer"],
    });

    const createdRs = await db.execute({
      sql: "SELECT id, username, role, created_at FROM users WHERE id = ?",
      args: [Number(insertRs.lastInsertRowid)],
    });

    const created = createdRs.rows.length
      ? Object.fromEntries(
          createdRs.columns.map((col, i) => [col, createdRs.rows[0][i]]),
        )
      : null;

    return NextResponse.json({ success: true, user: created }, { status: 201 });
  } catch (err) {
    console.error("[users POST]", err);
    return NextResponse.json(
      { error: "Failed to create user. Please try again." },
      { status: 500 },
    );
  }
}
