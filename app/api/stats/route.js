import { NextResponse } from "next/server";
import { getDb, first, all } from "@/lib/db";
import { getSession } from "@/lib/auth";

// ── Destination normaliser ────────────────────────────────────────────────────
// Handles "Origin → Destination" route strings as well as bare location names.
function normalizeDestination(loc) {
  if (!loc) return null;
  // If the string contains an arrow, take only the destination half
  const arrow = loc.indexOf("→");
  let dest = arrow >= 0 ? loc.slice(arrow + 1).trim() : loc.trim();
  if (!dest) return null;

  const lower = dest.toLowerCase();

  if (
    /\b(usa|united states?|america|california|new york|florida|texas|chicago|boston|houston|los angeles|san francisco|ny|nyc)\b/.test(
      lower,
    )
  )
    return "USA";

  if (
    /\b(uk|united kingdom|england|britain|london|manchester|birmingham|glasgow)\b/.test(
      lower,
    )
  )
    return "United Kingdom";

  if (
    /\b(uae|dubai|abu dhabi|sharjah|ajman|ras al khaimah|fujairah)\b/.test(
      lower,
    )
  )
    return "UAE / Dubai";

  if (/\b(canada|toronto|vancouver|montreal|calgary|ottawa)\b/.test(lower))
    return "Canada";

  if (/\b(australia|sydney|melbourne|brisbane|perth|adelaide)\b/.test(lower))
    return "Australia";

  if (/\b(bahrain|manama)\b/.test(lower)) return "Bahrain";
  if (/\b(qatar|doha)\b/.test(lower)) return "Qatar";
  if (/\b(oman|muscat|salalah)\b/.test(lower)) return "Oman";
  if (/\b(saudi|riyadh|jeddah|dammam|ksa)\b/.test(lower)) return "Saudi Arabia";
  if (/\b(singapore)\b/.test(lower)) return "Singapore";
  if (/\b(malaysia|kuala lumpur|kl)\b/.test(lower)) return "Malaysia";
  if (/\b(germany|deutschland|berlin|frankfurt|munich)\b/.test(lower))
    return "Germany";
  if (/\b(france|paris|lyon|marseille)\b/.test(lower)) return "France";
  if (/\b(italy|rome|milan|naples)\b/.test(lower)) return "Italy";
  if (/\b(new zealand|auckland|wellington)\b/.test(lower)) return "New Zealand";
  if (/\b(nepal|kathmandu)\b/.test(lower)) return "Nepal";
  if (/\b(sri lanka|colombo|ceylon)\b/.test(lower)) return "Sri Lanka";
  if (/\b(bangladesh|dhaka)\b/.test(lower)) return "Bangladesh";
  if (/\b(pakistan|karachi|lahore|islamabad)\b/.test(lower)) return "Pakistan";
  if (
    /\b(domestic|india|mumbai|delhi|bangalore|bengaluru|chennai|kolkata|hyderabad|pune|ahmedabad|surat|jaipur|lucknow|nagpur|indore)\b/.test(
      lower,
    )
  )
    return "Domestic (India)";

  // Fallback: return the cleaned destination as-is (capitalised)
  return dest.charAt(0).toUpperCase() + dest.slice(1);
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();

  // ── Total queries ──────────────────────────────────────────────────────────
  const totalRs = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM queries",
    args: [],
  });
  const totalQueries = Number(totalRs.rows[0][0]);

  // ── Status breakdown ───────────────────────────────────────────────────────
  const statusRs = await db.execute({
    sql: "SELECT status, COUNT(*) as cnt FROM queries WHERE status IS NOT NULL GROUP BY status",
    args: [],
  });
  const statusRows = all(statusRs);

  const statusBuckets = {
    "Sale Converted": 0,
    "Pitch In-Progress": 0,
    Closed: 0,
    "Awaiting Response": 0,
    "Pickup Scheduled": 0,
    "In Progress": 0,
    Other: 0,
  };

  for (const row of statusRows) {
    const s = (row.status || "").trim().toLowerCase();
    if (s.includes("sale") || s === "sale converted") {
      statusBuckets["Sale Converted"] += Number(row.cnt);
    } else if (
      s.includes("pickup") ||
      s.includes("pick up") ||
      s.includes("pickup arrange") ||
      s.includes("pickup scheduled")
    ) {
      statusBuckets["Pickup Scheduled"] += Number(row.cnt);
    } else if (
      s.includes("awaiting") ||
      s.includes("awaitig") ||
      s.includes("awaiting for")
    ) {
      statusBuckets["Awaiting Response"] += Number(row.cnt);
    } else if (
      s.includes("pitch in-progress") ||
      s.includes("pitch in progress") ||
      s === "pitch i progress"
    ) {
      statusBuckets["Pitch In-Progress"] += Number(row.cnt);
    } else if (
      s.includes("in progress") ||
      s.includes("in process") ||
      s.includes("still in process") ||
      s.includes("in fedex ip") ||
      s === "tracking status"
    ) {
      statusBuckets["In Progress"] += Number(row.cnt);
    } else if (
      s.includes("closed") ||
      s.includes("close") ||
      s.includes("no response")
    ) {
      statusBuckets["Closed"] += Number(row.cnt);
    } else {
      statusBuckets["Other"] += Number(row.cnt);
    }
  }

  // ── Source breakdown ───────────────────────────────────────────────────────
  const sourceRs = await db.execute({
    sql: `
      SELECT
        CASE
          WHEN LOWER(TRIM(source)) = '3cx' OR LOWER(TRIM(source)) = '3cx ' THEN '3CX'
          WHEN LOWER(TRIM(source)) LIKE '%email%' OR LOWER(TRIM(source)) LIKE '%lead email%' THEN 'Email'
          WHEN LOWER(TRIM(source)) LIKE '%facebook%' OR LOWER(TRIM(source)) LIKE '%fb%' OR LOWER(TRIM(source)) LIKE '%chat%' THEN 'Facebook/Chat'
          WHEN LOWER(TRIM(source)) LIKE '%whatsapp%' THEN 'WhatsApp'
          WHEN LOWER(TRIM(source)) LIKE '%call%' THEN 'Call'
          ELSE 'Other'
        END as src,
        COUNT(*) as cnt
      FROM queries
      WHERE source IS NOT NULL
      GROUP BY src
      ORDER BY cnt DESC
    `,
    args: [],
  });
  const sourceBreakdown = all(sourceRs).map((r) => ({
    src: r.src,
    cnt: Number(r.cnt),
  }));

  // ── Top destinations ───────────────────────────────────────────────────────
  // Pull every non-empty location from queries, normalise in JS, then rank.
  const locRs = await db.execute({
    sql: `
      SELECT location, COUNT(*) as cnt
      FROM queries
      WHERE location IS NOT NULL AND TRIM(location) != ''
      GROUP BY location
    `,
    args: [],
  });

  const destMap = {};
  for (const row of all(locRs)) {
    const dest = normalizeDestination(row.location);
    if (!dest) continue;
    destMap[dest] = (destMap[dest] || 0) + Number(row.cnt);
  }

  const sortedDests = Object.entries(destMap).sort((a, b) => b[1] - a[1]);
  const top5 = sortedDests.slice(0, 5);
  const othersCount = sortedDests.slice(5).reduce((sum, [, n]) => sum + n, 0);

  const topDestinations = top5.map(([name, cnt]) => ({ name, cnt }));
  if (othersCount > 0)
    topDestinations.push({ name: "Others", cnt: othersCount });

  // ── Sales stats — from Sale Converted queries (freight_amt field) ──────────
  // The "closed leads" KPI uses queries where status = Sale Converted because
  // that is where the freight amount (freight_amt) lives alongside the AWB.
  const salesStatsRs = await db.execute({
    sql: `
      SELECT
        COUNT(*)         as total_sales,
        SUM(freight_amt) as total_amount,
        AVG(freight_amt) as avg_amount,
        MAX(freight_amt) as max_amount
      FROM queries
      WHERE LOWER(TRIM(status)) LIKE '%sale%'
    `,
    args: [],
  });
  const ss = first(salesStatsRs);

  // ── Recent queries (last 10) ───────────────────────────────────────────────
  const recentQueriesRs = await db.execute({
    sql: `
      SELECT id, date, source, name, contact, location, category, status, remarks
      FROM queries
      ORDER BY id DESC
      LIMIT 10
    `,
    args: [],
  });

  // ── Recent closed sales (last 10) ─────────────────────────────────────────
  const recentSalesRs = await db.execute({
    sql: `
      SELECT id, query_date, query_no, name, source, location, awb, amount
      FROM closed_sales
      ORDER BY id DESC
      LIMIT 10
    `,
    args: [],
  });

  // ── Queries added this month ───────────────────────────────────────────────
  const thisMonthRs = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM queries WHERE created_at >= date('now', 'start of month')`,
    args: [],
  });
  const thisMonth = Number(thisMonthRs.rows[0][0]);

  // ── Follow-ups due today or overdue ───────────────────────────────────────
  const followUpsDueRs = await db.execute({
    sql: `
      SELECT COUNT(*) as cnt FROM queries
      WHERE follow_up IS NOT NULL
        AND follow_up <= date('now')
        AND (status NOT LIKE '%closed%' AND status NOT LIKE '%sale%')
    `,
    args: [],
  });
  const followUpsDue = Number(followUpsDueRs.rows[0][0]);

  return NextResponse.json({
    totalQueries,
    thisMonth,
    followUpsDue,
    statusBuckets,
    sourceBreakdown,
    topDestinations,
    salesStats: {
      totalSales: ss ? Number(ss.total_sales) || 0 : 0,
      totalAmount: ss ? Number(ss.total_amount) || 0 : 0,
      avgAmount: ss ? Number(ss.avg_amount) || 0 : 0,
      maxAmount: ss ? Number(ss.max_amount) || 0 : 0,
    },
    recentQueries: all(recentQueriesRs),
    recentSales: all(recentSalesRs),
  });
}
