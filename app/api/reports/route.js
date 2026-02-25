import { NextResponse } from "next/server";
import { getDb, all, first } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = ["admin", "manager"];

function getDateRange(period) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const today = fmt(now);

  switch (period) {
    case "today":
      return { from: today, to: today, label: `Today (${today})` };

    case "week": {
      const day = now.getDay(); // 0=Sun
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now);
      mon.setDate(diff);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        from: fmt(mon),
        to: fmt(sun),
        label: `This Week (${fmt(mon)} – ${fmt(sun)})`,
      };
    }

    case "month": {
      const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from,
        to: fmt(lastDay),
        label: `This Month (${now.toLocaleString("en-IN", { month: "long", year: "numeric" })})`,
      };
    }

    case "year": {
      const from = `${now.getFullYear()}-01-01`;
      const to = `${now.getFullYear()}-12-31`;
      return {
        from,
        to,
        label: `This Year (${now.getFullYear()})`,
      };
    }

    default:
      return { from: today, to: today, label: `Today (${today})` };
  }
}

async function gatherReportData(db, from, to) {
  // Total queries in range
  const totalQueriesRs = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM queries
          WHERE date >= ? AND date <= ?`,
    args: [from, to],
  });
  const totalQueries = Number(totalQueriesRs.rows[0][0]);

  // Status breakdown
  const statusRs = await db.execute({
    sql: `SELECT status, COUNT(*) as cnt FROM queries
          WHERE date >= ? AND date <= ?
          AND status IS NOT NULL
          GROUP BY status
          ORDER BY cnt DESC`,
    args: [from, to],
  });
  const statusBreakdown = all(statusRs).map((r) => ({
    status: r.status,
    cnt: Number(r.cnt),
  }));

  // Closed sales in range
  const salesRs = await db.execute({
    sql: `SELECT * FROM closed_sales
          WHERE query_date >= ? AND query_date <= ?
          ORDER BY query_date DESC`,
    args: [from, to],
  });
  const sales = all(salesRs);

  // Sales totals
  const salesTotalRs = await db.execute({
    sql: `SELECT COUNT(*) as cnt, SUM(amount) as total, MAX(amount) as max_amt, AVG(amount) as avg_amt
          FROM closed_sales
          WHERE query_date >= ? AND query_date <= ?`,
    args: [from, to],
  });
  const st = first(salesTotalRs);

  // Source breakdown
  const sourceRs = await db.execute({
    sql: `SELECT
            CASE
              WHEN LOWER(TRIM(source)) = '3cx' OR LOWER(TRIM(source)) = '3cx ' THEN '3CX'
              WHEN LOWER(TRIM(source)) LIKE '%email%' THEN 'Email'
              WHEN LOWER(TRIM(source)) LIKE '%facebook%' OR LOWER(TRIM(source)) LIKE '%fb%' OR LOWER(TRIM(source)) LIKE '%chat%' THEN 'Facebook/Chat'
              WHEN LOWER(TRIM(source)) LIKE '%whatsapp%' THEN 'WhatsApp'
              WHEN LOWER(TRIM(source)) LIKE '%call%' THEN 'Call'
              ELSE 'Other'
            END as src,
            COUNT(*) as cnt
          FROM queries
          WHERE date >= ? AND date <= ?
          AND source IS NOT NULL
          GROUP BY src
          ORDER BY cnt DESC`,
    args: [from, to],
  });
  const sourceBreakdown = all(sourceRs).map((r) => ({
    src: r.src,
    cnt: Number(r.cnt),
  }));

  // Follow-ups due in range
  const followRs = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM queries
          WHERE follow_up >= ? AND follow_up <= ?
          AND (status NOT LIKE '%closed%' AND status NOT LIKE '%sale%')`,
    args: [from, to],
  });
  const followUpsDue = Number(followRs.rows[0][0]);

  return {
    totalQueries,
    statusBreakdown,
    sales,
    salesCount: Number(st?.cnt || 0),
    totalAmount: Number(st?.total || 0),
    maxAmount: Number(st?.max_amt || 0),
    avgAmount: Number(st?.avg_amt || 0),
    sourceBreakdown,
    followUpsDue,
  };
}

function buildHtmlReport({ data, range, siteName, logoUrl, generatedBy }) {
  const fmt = (n) =>
    Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const fmtRs = (n) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(2)}L`
      : `₹${fmt(n)}`;

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${siteName}" style="height:40px;object-fit:contain;"/>`
    : `<div style="width:46px;height:46px;border-radius:12px;background:rgba(79,166,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;">📦</div>`;

  const statusRows = data.statusBreakdown
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#cddcff;">${r.status}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#fff;font-weight:600;text-align:right;">${r.cnt}</td>
      </tr>`,
    )
    .join("");

  const saleRows = data.sales
    .slice(0, 20)
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#aab9e0;font-size:12px;">${s.query_date || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#cddcff;">${s.name || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#aab9e0;">${s.location || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#aab9e0;font-family:monospace;font-size:12px;">${s.awb || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#70e6a0;font-weight:700;text-align:right;">${s.amount ? fmtRs(s.amount) : "—"}</td>
      </tr>`,
    )
    .join("");

  const sourceRows = data.sourceBreakdown
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#cddcff;">${r.src}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2d4a;color:#fff;font-weight:600;text-align:right;">${r.cnt}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${siteName} – Sales Report</title>
</head>
<body style="margin:0;padding:0;background:#080e1a;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:720px;margin:0 auto;padding:32px 20px;">

    <!-- Header -->
    <div style="background:rgba(18,28,48,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px 32px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${logoHtml}
        <div>
          <div style="font-size:20px;font-weight:800;color:#eef2ff;letter-spacing:2px;">${siteName}</div>
          <div style="font-size:12px;color:#4a5d80;margin-top:2px;">Sales & Query Report</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px;color:#8fa3cc;">${range.label}</div>
        <div style="font-size:11px;color:#4a5d80;margin-top:4px;">Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>
        <div style="font-size:11px;color:#4a5d80;">By: ${generatedBy}</div>
      </div>
    </div>

    <!-- KPI row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
      ${[
        { label: "Total Queries", value: data.totalQueries, color: "#4fa6ff", icon: "📋" },
        { label: "Sales Closed", value: data.salesCount, color: "#70e6a0", icon: "✅" },
        { label: "Total Revenue", value: fmtRs(data.totalAmount), color: "#ffb44a", icon: "₹" },
        { label: "Follow-ups Due", value: data.followUpsDue, color: "#c07df5", icon: "🔔" },
      ]
        .map(
          (k) => `
        <div style="background:rgba(18,28,48,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;border-top:2px solid ${k.color};">
          <div style="font-size:18px;margin-bottom:6px;">${k.icon}</div>
          <div style="font-size:10px;color:#4a5d80;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${k.label}</div>
          <div style="font-size:22px;font-weight:700;color:#eef2ff;">${k.value}</div>
        </div>`,
        )
        .join("")}
    </div>

    <!-- Status + Source -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div style="background:rgba(18,28,48,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
        <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:10px;font-weight:700;color:#4a5d80;text-transform:uppercase;letter-spacing:1px;">Status Breakdown</div>
        <table style="width:100%;border-collapse:collapse;">${statusRows || '<tr><td colspan="2" style="padding:16px;color:#4a5d80;text-align:center;">No data</td></tr>'}</table>
      </div>
      <div style="background:rgba(18,28,48,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
        <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:10px;font-weight:700;color:#4a5d80;text-transform:uppercase;letter-spacing:1px;">Leads by Source</div>
        <table style="width:100%;border-collapse:collapse;">${sourceRows || '<tr><td colspan="2" style="padding:16px;color:#4a5d80;text-align:center;">No data</td></tr>'}</table>
      </div>
    </div>

    <!-- Sales table -->
    <div style="background:rgba(18,28,48,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:10px;font-weight:700;color:#4a5d80;text-transform:uppercase;letter-spacing:1px;">Closed Sales</span>
        <span style="font-size:12px;color:#70e6a0;font-weight:700;">Total: ${fmtRs(data.totalAmount)}</span>
      </div>
      ${
        saleRows
          ? `<table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:rgba(255,255,255,0.02);">
                  <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a5d80;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;">Date</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a5d80;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;">Customer</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a5d80;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;">Location</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a5d80;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;">AWB</th>
                  <th style="padding:8px 12px;text-align:right;font-size:10px;color:#4a5d80;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;">Amount</th>
                </tr>
              </thead>
              <tbody>${saleRows}</tbody>
            </table>`
          : '<div style="padding:24px;text-align:center;color:#4a5d80;font-size:13px;">No sales recorded for this period.</div>'
      }
      ${data.sales.length > 20 ? `<div style="padding:10px 16px;font-size:11px;color:#4a5d80;text-align:center;">Showing first 20 of ${data.sales.length} records</div>` : ""}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;font-size:11px;color:#2a3a5a;">
      ${siteName} CRM · Confidential Internal Report · ${new Date().toLocaleDateString("en-IN")}
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role))
    return NextResponse.json(
      { error: "Only admin or manager can generate reports" },
      { status: 403 },
    );

  try {
    const body = await request.json().catch(() => null);
    if (!body)
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );

    const { period = "month", email, action = "preview" } = body;

    const validPeriods = ["today", "week", "month", "year"];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use: today, week, month, year" },
        { status: 400 },
      );
    }

    if (action === "send" && (!email || !String(email).includes("@"))) {
      return NextResponse.json(
        { error: "A valid email address is required to send the report" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const range = getDateRange(period);
    const data = await gatherReportData(db, range.from, range.to);

    // Get site settings for logo/name
    const settingsRs = await db.execute({
      sql: "SELECT key, value FROM settings",
      args: [],
    });
    const settingsRows = all(settingsRs);
    const settings = {};
    for (const row of settingsRows) settings[row.key] = row.value;

    const siteName = settings.site_name || "BOMBINO";
    const logoUrl = settings.logo_url || "";

    const html = buildHtmlReport({
      data,
      range,
      siteName,
      logoUrl,
      generatedBy: session.username,
    });

    // If preview — return JSON data only
    if (action === "preview") {
      return NextResponse.json({ success: true, data, range, html });
    }

    // If send — dispatch via Mailgun
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      return NextResponse.json(
        {
          error:
            "Mailgun is not configured. Add MAILGUN_API_KEY and MAILGUN_DOMAIN to your environment variables.",
        },
        { status: 503 },
      );
    }

    const Mailgun = (await import("mailgun.js")).default;
    const formData = (await import("form-data")).default;

    const mg = new Mailgun(formData);
    const client = mg.client({
      username: "api",
      key: mailgunApiKey,
      url: process.env.MAILGUN_URL || "https://api.mailgun.net",
    });

    const periodLabels = {
      today: "Daily",
      week: "Weekly",
      month: "Monthly",
      year: "Annual",
    };

    await client.messages.create(mailgunDomain, {
      from:
        process.env.MAILGUN_FROM ||
        `${siteName} CRM <noreply@${mailgunDomain}>`,
      to: [String(email).trim()],
      subject: `${siteName} ${periodLabels[period]} Report – ${range.label}`,
      html,
      text: `${siteName} Report\n\nPeriod: ${range.label}\n\nTotal Queries: ${data.totalQueries}\nSales Closed: ${data.salesCount}\nTotal Revenue: ₹${data.totalAmount}\n\nGenerated by ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Report sent to ${email}`,
      range,
    });
  } catch (err) {
    console.error("[reports POST]", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate report" },
      { status: 500 },
    );
  }
}
