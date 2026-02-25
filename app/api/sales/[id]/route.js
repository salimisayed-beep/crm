import { NextResponse } from "next/server";
import { getDb, first } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PUT /api/sales/[id] - update a closed sale
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer")
    return NextResponse.json(
      { error: "Your account does not have permission to edit sales" },
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

    const existingRs = await db.execute({
      sql: "SELECT id FROM closed_sales WHERE id = ?",
      args: [id],
    });
    if (!existingRs.rows.length)
      return NextResponse.json(
        { error: "Sale record not found" },
        { status: 404 },
      );

    await db.execute({
      sql: `UPDATE closed_sales SET
              query_date = ?, query_no = ?, name = ?, source = ?,
              contact = ?, location = ?, awb = ?, amount = ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        query_date || null,
        query_no || null,
        String(name).trim(),
        source || null,
        contact || null,
        location || null,
        awb || null,
        amount !== undefined && amount !== null && amount !== ""
          ? parseFloat(amount)
          : null,
        id,
      ],
    });

    const updatedRs = await db.execute({
      sql: "SELECT * FROM closed_sales WHERE id = ?",
      args: [id],
    });
    return NextResponse.json({ success: true, row: first(updatedRs) });
  } catch (err) {
    console.error("[sales PUT]", err);
    return NextResponse.json(
      { error: "Failed to update sale record. Please try again." },
      { status: 500 },
    );
  }
}

// DELETE /api/sales/[id] - delete a closed sale (admin only)
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Only admins can delete sale records" },
      { status: 403 },
    );

  try {
    const { id } = await params;
    const db = await getDb();

    const existingRs = await db.execute({
      sql: "SELECT id FROM closed_sales WHERE id = ?",
      args: [id],
    });
    if (!existingRs.rows.length)
      return NextResponse.json(
        { error: "Sale record not found" },
        { status: 404 },
      );

    await db.execute({
      sql: "DELETE FROM closed_sales WHERE id = ?",
      args: [id],
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sales DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete sale record. Please try again." },
      { status: 500 },
    );
  }
}
