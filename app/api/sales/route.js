import { NextResponse } from "next/server";
import { getDb, first, all } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/sales - list all closed sales
export async function GET(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const db = await getDb();

  let where = [];
  let params = [];

  if (search) {
    where.push(
      `(name LIKE ? OR contact LIKE ? OR location LIKE ? OR awb LIKE ? OR query_no LIKE ?)`,
    );
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const rowsRs = await db.execute({
      sql: `SELECT * FROM closed_sales ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      args: [...params, limit, offset],
    });

    const totalRs = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM closed_sales ${whereClause}`,
      args: params,
    });

    const totalAmountRs = await db.execute({
      sql: `SELECT SUM(amount) as total FROM closed_sales`,
      args: [],
    });

    return NextResponse.json({
      rows: all(rowsRs),
      total: Number(totalRs.rows[0][0]),
      totalAmount: totalAmountRs.rows[0][0]
        ? Number(totalAmountRs.rows[0][0])
        : 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[sales GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch sales records" },
      { status: 500 },
    );
  }
}

// POST /api/sales - create a new closed sale
export async function POST(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer")
    return NextResponse.json(
      { error: "Your account does not have permission to add sales" },
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
      query_date,
      query_no,
      name,
      source,
      contact,
      location,
      awb,
      amount,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 },
      );
    }

    if (
      amount !== undefined &&
      amount !== null &&
      amount !== "" &&
      isNaN(parseFloat(amount))
    ) {
      return NextResponse.json(
        { error: "Amount must be a valid number" },
        { status: 400 },
      );
    }

    const db = await getDb();

    const insertRs = await db.execute({
      sql: `INSERT INTO closed_sales
              (query_date, query_no, name, source, contact, location, awb, amount, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        query_date || null,
        query_no || null,
        String(name).trim(),
        source || null,
        contact || null,
        location || null,
        awb || null,
        amount ? parseFloat(amount) : null,
      ],
    });

    const createdRs = await db.execute({
      sql: "SELECT * FROM closed_sales WHERE id = ?",
      args: [Number(insertRs.lastInsertRowid)],
    });

    return NextResponse.json(
      { success: true, row: first(createdRs) },
      { status: 201 },
    );
  } catch (err) {
    console.error("[sales POST]", err);
    return NextResponse.json(
      { error: "Failed to create sale record. Please try again." },
      { status: 500 },
    );
  }
}
