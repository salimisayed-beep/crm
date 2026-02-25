import { NextResponse } from "next/server";
import { getDb, first, all } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/queries - list all queries with optional filters
export async function GET(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const source = searchParams.get("source") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const db = await getDb();

  let where = [];
  let params = [];

  if (search) {
    where.push(
      `(name LIKE ? OR contact LIKE ? OR query LIKE ? OR location LIKE ? OR category LIKE ?)`,
    );
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  if (status) {
    where.push(`status = ?`);
    params.push(status);
  }
  if (source) {
    where.push(`source = ?`);
    params.push(source);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const rowsRs = await db.execute({
      sql: `SELECT * FROM queries ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      args: [...params, limit, offset],
    });

    const totalRs = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM queries ${whereClause}`,
      args: params,
    });

    return NextResponse.json({
      rows: all(rowsRs),
      total: Number(totalRs.rows[0][0]),
      page,
      limit,
    });
  } catch (err) {
    console.error("[queries GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch queries" },
      { status: 500 },
    );
  }
}

// POST /api/queries - create a new query
export async function POST(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer")
    return NextResponse.json(
      { error: "Your account does not have permission to add queries" },
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

    const {
      date,
      source,
      name,
      contact,
      location,
      query,
      category,
      status,
      remarks,
      response_date,
      follow_up,
      nxt_follow_up,
      awb,
      freight_amt,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 },
      );
    }

    const db = await getDb();

    const insertRs = await db.execute({
      sql: `INSERT INTO queries
              (date, source, name, contact, location, query, category, status, remarks,
               response_date, follow_up, nxt_follow_up, awb, freight_amt, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        date || null,
        source || null,
        name.trim(),
        contact || null,
        location || null,
        query || null,
        category || null,
        status || null,
        remarks || null,
        response_date || null,
        follow_up || null,
        nxt_follow_up || null,
        awb || null,
        freight_amt ? parseFloat(freight_amt) : null,
      ],
    });

    const createdRs = await db.execute({
      sql: "SELECT * FROM queries WHERE id = ?",
      args: [Number(insertRs.lastInsertRowid)],
    });

    return NextResponse.json(
      { success: true, row: first(createdRs) },
      { status: 201 },
    );
  } catch (err) {
    console.error("[queries POST]", err);
    return NextResponse.json(
      { error: "Failed to create query. Please try again." },
      { status: 500 },
    );
  }
}
