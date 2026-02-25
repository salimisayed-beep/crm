import { NextResponse } from "next/server";
import { getDb, first } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PUT /api/queries/[id] - update a query
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer")
    return NextResponse.json(
      { error: "Your account does not have permission to edit queries" },
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

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 },
      );
    }

    const db = await getDb();

    const existingRs = await db.execute({
      sql: "SELECT id FROM queries WHERE id = ?",
      args: [id],
    });
    if (!existingRs.rows.length)
      return NextResponse.json({ error: "Query not found" }, { status: 404 });

    await db.execute({
      sql: `UPDATE queries SET
              date = ?, source = ?, name = ?, contact = ?, location = ?,
              query = ?, category = ?, status = ?, remarks = ?,
              response_date = ?, follow_up = ?, nxt_follow_up = ?,
              awb = ?, freight_amt = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        date || null,
        source || null,
        String(name).trim(),
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
        id,
      ],
    });

    const updatedRs = await db.execute({
      sql: "SELECT * FROM queries WHERE id = ?",
      args: [id],
    });
    return NextResponse.json({ success: true, row: first(updatedRs) });
  } catch (err) {
    console.error("[queries PUT]", err);
    return NextResponse.json(
      { error: "Failed to update query. Please try again." },
      { status: 500 },
    );
  }
}

// DELETE /api/queries/[id] - delete a query (admin only)
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can delete queries" },
      { status: 403 },
    );

  try {
    const { id } = await params;
    const db = await getDb();

    const existingRs = await db.execute({
      sql: "SELECT id FROM queries WHERE id = ?",
      args: [id],
    });
    if (!existingRs.rows.length)
      return NextResponse.json({ error: "Query not found" }, { status: 404 });

    await db.execute({
      sql: "DELETE FROM queries WHERE id = ?",
      args: [id],
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[queries DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete query. Please try again." },
      { status: 500 },
    );
  }
}
