import { NextResponse } from "next/server";
import { getDb, first } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MANAGER_UP = ["admin", "manager"];

// DELETE /api/schema/[key] — remove a custom field (non-core only)
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_UP.includes(session.role))
    return NextResponse.json(
      { error: "Only admin or manager can modify the schema" },
      { status: 403 },
    );

  try {
    const { key } = await params;
    const db = await getDb();

    const fieldRs = await db.execute({
      sql: "SELECT * FROM query_schema WHERE field_key = ?",
      args: [key],
    });
    const field = first(fieldRs);

    if (!field)
      return NextResponse.json({ error: "Field not found" }, { status: 404 });

    if (field.is_core)
      return NextResponse.json(
        { error: "Core fields cannot be deleted" },
        { status: 400 },
      );

    await db.execute({
      sql: "DELETE FROM query_schema WHERE field_key = ?",
      args: [key],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[schema DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 },
    );
  }
}

// PUT /api/schema/[key] — update a single field (label, options, visibility, required)
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_UP.includes(session.role))
    return NextResponse.json(
      { error: "Only admin or manager can modify the schema" },
      { status: 403 },
    );

  try {
    const { key } = await params;
    const body = await request.json().catch(() => null);

    if (!body)
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );

    const db = await getDb();

    const existingRs = await db.execute({
      sql: "SELECT * FROM query_schema WHERE field_key = ?",
      args: [key],
    });
    const existing = first(existingRs);

    if (!existing)
      return NextResponse.json({ error: "Field not found" }, { status: 404 });

    const label =
      body.label !== undefined
        ? String(body.label).trim() || existing.label
        : existing.label;

    const options_json =
      body.options !== undefined
        ? body.options && body.options.length > 0
          ? JSON.stringify(body.options)
          : null
        : existing.options_json;

    const is_required =
      body.is_required !== undefined
        ? body.is_required
          ? 1
          : 0
        : existing.is_required;

    const visible =
      body.visible !== undefined ? (body.visible ? 1 : 0) : existing.visible;

    await db.execute({
      sql: `UPDATE query_schema
               SET label        = ?,
                   options_json = ?,
                   is_required  = ?,
                   visible      = ?
             WHERE field_key = ?`,
      args: [label, options_json, is_required, visible, key],
    });

    const updatedRs = await db.execute({
      sql: "SELECT * FROM query_schema WHERE field_key = ?",
      args: [key],
    });
    const updated = first(updatedRs);

    return NextResponse.json({
      success: true,
      field: {
        ...updated,
        options: updated.options_json ? JSON.parse(updated.options_json) : [],
        is_core: Boolean(updated.is_core),
        is_required: Boolean(updated.is_required),
        visible: Boolean(updated.visible),
      },
    });
  } catch (err) {
    console.error("[schema PUT key]", err);
    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 },
    );
  }
}
