import { NextResponse } from "next/server";
import { getDb, first, all } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MANAGER_UP = ["admin", "manager"];

// GET /api/schema — return all fields ordered by sort_order
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const rs = await db.execute({
      sql: "SELECT * FROM query_schema ORDER BY sort_order ASC, id ASC",
      args: [],
    });

    const fields = all(rs).map((f) => ({
      ...f,
      options: f.options_json ? JSON.parse(f.options_json) : [],
      is_core: Boolean(f.is_core),
      is_required: Boolean(f.is_required),
      visible: Boolean(f.visible),
    }));

    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[schema GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch schema" },
      { status: 500 },
    );
  }
}

// POST /api/schema — create a new custom field (admin / manager only)
export async function POST(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_UP.includes(session.role))
    return NextResponse.json(
      { error: "Only admin or manager can modify the schema" },
      { status: 403 },
    );

  try {
    const body = await request.json().catch(() => null);
    if (!body)
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );

    const { label, field_type, options, is_required } = body;

    if (!label || !String(label).trim())
      return NextResponse.json(
        { error: "Field label is required" },
        { status: 400 },
      );

    const validTypes = ["text", "textarea", "number", "date", "select"];
    if (!validTypes.includes(field_type))
      return NextResponse.json(
        { error: "Invalid field type" },
        { status: 400 },
      );

    if (field_type === "select" && (!options || options.length === 0))
      return NextResponse.json(
        { error: "Select fields must have at least one option" },
        { status: 400 },
      );

    const db = await getDb();

    // Build a safe field_key from the label (snake_case, prefixed cf_)
    const baseKey =
      "cf_" +
      String(label)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 30);

    // Ensure uniqueness by appending a suffix if needed
    let field_key = baseKey;
    let suffix = 1;
    while (true) {
      const checkRs = await db.execute({
        sql: "SELECT id FROM query_schema WHERE field_key = ?",
        args: [field_key],
      });
      if (!checkRs.rows.length) break;
      field_key = `${baseKey}_${suffix++}`;
    }

    // Max sort_order + 1
    const maxRs = await db.execute({
      sql: "SELECT MAX(sort_order) as m FROM query_schema",
      args: [],
    });
    const sort_order =
      maxRs.rows[0][0] != null ? Number(maxRs.rows[0][0]) + 1 : 0;

    const insertRs = await db.execute({
      sql: `INSERT INTO query_schema
               (field_key, label, field_type, options_json, is_core, is_required, visible, sort_order)
             VALUES (?, ?, ?, ?, 0, ?, 1, ?)`,
      args: [
        field_key,
        String(label).trim(),
        field_type,
        field_type === "select" ? JSON.stringify(options) : null,
        is_required ? 1 : 0,
        sort_order,
      ],
    });

    const createdRs = await db.execute({
      sql: "SELECT * FROM query_schema WHERE id = ?",
      args: [Number(insertRs.lastInsertRowid)],
    });
    const created = first(createdRs);

    return NextResponse.json(
      {
        success: true,
        field: {
          ...created,
          options: created.options_json ? JSON.parse(created.options_json) : [],
          is_core: false,
          is_required: Boolean(created.is_required),
          visible: Boolean(created.visible),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[schema POST]", err);
    return NextResponse.json(
      { error: "Failed to create field" },
      { status: 500 },
    );
  }
}

// PUT /api/schema — bulk-save: reorder + label + visibility + options for ALL fields
export async function PUT(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_UP.includes(session.role))
    return NextResponse.json(
      { error: "Only admin or manager can modify the schema" },
      { status: 403 },
    );

  try {
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.fields))
      return NextResponse.json(
        { error: "Expected { fields: [...] }" },
        { status: 400 },
      );

    const db = await getDb();

    // Execute updates as a batch
    const statements = body.fields.map((f, idx) => ({
      sql: `UPDATE query_schema
               SET label        = ?,
                   options_json = ?,
                   is_required  = ?,
                   visible      = ?,
                   sort_order   = ?
             WHERE field_key = ?`,
      args: [
        String(f.label || "").trim() || f.field_key,
        f.options && f.options.length > 0 ? JSON.stringify(f.options) : null,
        f.is_required ? 1 : 0,
        f.visible !== false ? 1 : 0,
        idx,
        f.field_key,
      ],
    }));

    await db.batch(statements, "write");

    const updatedRs = await db.execute({
      sql: "SELECT * FROM query_schema ORDER BY sort_order ASC, id ASC",
      args: [],
    });

    const fields = all(updatedRs).map((f) => ({
      ...f,
      options: f.options_json ? JSON.parse(f.options_json) : [],
      is_core: Boolean(f.is_core),
      is_required: Boolean(f.is_required),
      visible: Boolean(f.visible),
    }));

    return NextResponse.json({ success: true, fields });
  } catch (err) {
    console.error("[schema PUT]", err);
    return NextResponse.json(
      { error: "Failed to save schema changes" },
      { status: 500 },
    );
  }
}
