import { NextResponse } from "next/server";
import { getDb, all } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/settings — public, no auth required (logo/name needed on login page too)
export async function GET() {
  try {
    const db = await getDb();
    const rs = await db.execute({
      sql: "SELECT key, value FROM settings",
      args: [],
    });

    const rows = all(rs);
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[settings GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// PUT /api/settings — admin only
export async function PUT(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can update settings" },
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

    const db = await getDb();

    const allowed = ["logo_url", "site_name", "report_email"];

    for (const key of allowed) {
      if (key in body) {
        const value = body[key] == null ? "" : String(body[key]);
        await db.execute({
          sql: `INSERT INTO settings (key, value, updated_at)
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          args: [key, value],
        });
      }
    }

    // Return fresh settings
    const rs = await db.execute({
      sql: "SELECT key, value FROM settings",
      args: [],
    });
    const rows = all(rs);
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error("[settings PUT]", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
