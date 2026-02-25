import { NextResponse } from "next/server";
import { getDb, first } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// DELETE /api/users/[id] - delete a user (admin only)
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can delete users" },
      { status: 403 },
    );

  try {
    const { id } = await params;
    const db = await getDb();

    const existingRs = await db.execute({
      sql: "SELECT id, username FROM users WHERE id = ?",
      args: [id],
    });
    const existing = first(existingRs);

    if (!existing)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (existing.username === session.username) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[users DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete user. Please try again." },
      { status: 500 },
    );
  }
}

// PUT /api/users/[id] - update user role and/or password (admin only)
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can update users" },
      { status: 403 },
    );

  try {
    const { id } = await params;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { password, role } = body;

    const db = await getDb();

    const existingRs = await db.execute({
      sql: "SELECT id FROM users WHERE id = ?",
      args: [id],
    });
    if (!existingRs.rows.length)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const validRoles = ["admin", "manager", "editor", "viewer"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role — must be admin, manager, editor, or viewer" },
        { status: 400 },
      );
    }

    if (
      password !== undefined &&
      password !== null &&
      password !== "" &&
      (typeof password !== "string" || password.length < 6)
    ) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 },
      );
    }

    if (password && typeof password === "string" && password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.execute({
        sql: "UPDATE users SET password = ? WHERE id = ?",
        args: [hashedPassword, id],
      });
    }

    if (role) {
      await db.execute({
        sql: "UPDATE users SET role = ? WHERE id = ?",
        args: [role, id],
      });
    }

    const updatedRs = await db.execute({
      sql: "SELECT id, username, role, created_at FROM users WHERE id = ?",
      args: [id],
    });
    const updated = first(updatedRs);

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error("[users PUT]", err);
    return NextResponse.json(
      { error: "Failed to update user. Please try again." },
      { status: 500 },
    );
  }
}
