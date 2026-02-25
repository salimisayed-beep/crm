// import-csv.mjs
// Run with:  node import-csv.mjs
// Reads queries.csv and closed_sales.csv from the parent folder and inserts
// all rows into the Turso database using the same credentials as the app.

import { createClient } from "@libsql/client";
import { createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

// ── Locate files ──────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, ".."); // one level up → Excel Dashboard folder
const QUERIES_CSV = resolve(ROOT, "queries.csv");
const SALES_CSV = resolve(ROOT, "closed_sales.csv");

// ── Load env vars (the project uses a plain .env file) ────────────────────────
import { readFileSync } from "fs";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, ".env"), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env not found — rely on environment variables already set
  }
}
loadEnv();

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL) {
  console.error("❌  TURSO_DATABASE_URL is not set. Check your .env file.");
  process.exit(1);
}

// ── libsql client ─────────────────────────────────────────────────────────────
const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN || undefined,
});

// ── CSV parser ────────────────────────────────────────────────────────────────
// Returns an array of objects keyed by the header row.
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;

    const rl = createInterface({
      input: createReadStream(filePath, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });

    rl.on("line", (raw) => {
      const line = raw.trim();
      if (!line) return;

      // Simple CSV split that handles quoted fields with commas inside
      const fields = [];
      let inQuote = false;
      let cur = "";
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (ch === "," && !inQuote) {
          fields.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      fields.push(cur);

      if (!headers) {
        headers = fields;
        return;
      }

      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = fields[i] !== undefined ? fields[i].trim() : "";
      });
      rows.push(obj);
    });

    rl.on("close", () => resolve(rows));
    rl.on("error", reject);
  });
}

// ── Helper: null-or-value ─────────────────────────────────────────────────────
function v(val) {
  if (val === undefined || val === null || val === "") return null;
  return val;
}

function vNum(val) {
  if (val === undefined || val === null || val === "") return null;
  const n = parseFloat(String(val).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// ── Import queries ────────────────────────────────────────────────────────────
async function importQueries() {
  console.log("📂  Reading", QUERIES_CSV);
  const rows = await parseCSV(QUERIES_CSV);
  console.log(`   ${rows.length} rows found`);

  let inserted = 0;
  let skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const statements = chunk.map((r) => ({
      sql: `INSERT INTO queries
              (date, source, name, contact, location, query, category, status,
               remarks, response_date, follow_up, nxt_follow_up, awb, freight_amt,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [
        v(r.date),
        v(r.source),
        v(r.name),
        v(r.contact),
        v(r.location),
        v(r.query),
        v(r.category),
        v(r.status),
        v(r.remarks),
        v(r.response_date),
        v(r.follow_up),
        v(r.nxt_follow_up),
        v(r.awb),
        vNum(r.freight_amt),
      ],
    }));

    try {
      await db.batch(statements, "write");
      inserted += chunk.length;
    } catch (err) {
      // If batch fails try row-by-row to skip bad ones
      for (const r of chunk) {
        try {
          await db.execute({
            sql: `INSERT INTO queries
                    (date, source, name, contact, location, query, category, status,
                     remarks, response_date, follow_up, nxt_follow_up, awb, freight_amt,
                     created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [
              v(r.date),
              v(r.source),
              v(r.name),
              v(r.contact),
              v(r.location),
              v(r.query),
              v(r.category),
              v(r.status),
              v(r.remarks),
              v(r.response_date),
              v(r.follow_up),
              v(r.nxt_follow_up),
              v(r.awb),
              vNum(r.freight_amt),
            ],
          });
          inserted++;
        } catch {
          skipped++;
        }
      }
    }

    process.stdout.write(
      `\r   Inserted ${inserted} / ${rows.length}  (skipped ${skipped})`
    );
  }

  console.log(
    `\n✅  queries: ${inserted} inserted, ${skipped} skipped`
  );
}

// ── Import closed_sales ───────────────────────────────────────────────────────
async function importSales() {
  console.log("📂  Reading", SALES_CSV);
  const rows = await parseCSV(SALES_CSV);
  console.log(`   ${rows.length} rows found`);

  let inserted = 0;
  let skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const statements = chunk.map((r) => ({
      sql: `INSERT INTO closed_sales
              (query_date, query_no, name, source, contact, location, awb, amount,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [
        v(r.query_date),
        v(r.query_no),
        v(r.name),
        v(r.source),
        v(r.contact),
        v(r.location),
        v(r.awb),
        vNum(r.amount),
      ],
    }));

    try {
      await db.batch(statements, "write");
      inserted += chunk.length;
    } catch {
      for (const r of chunk) {
        try {
          await db.execute({
            sql: `INSERT INTO closed_sales
                    (query_date, query_no, name, source, contact, location, awb, amount,
                     created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [
              v(r.query_date),
              v(r.query_no),
              v(r.name),
              v(r.source),
              v(r.contact),
              v(r.location),
              v(r.awb),
              vNum(r.amount),
            ],
          });
          inserted++;
        } catch {
          skipped++;
        }
      }
    }

    process.stdout.write(
      `\r   Inserted ${inserted} / ${rows.length}  (skipped ${skipped})`
    );
  }

  console.log(
    `\n✅  closed_sales: ${inserted} inserted, ${skipped} skipped`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀  Bombino CRM — CSV Import");
  console.log("    Database:", TURSO_URL);
  console.log("");

  try {
    // Make sure tables exist (safe — getDb normally does this, but we call it
    // here directly so the script is self-contained)
    await db.execute("SELECT 1 FROM queries LIMIT 1");
    await db.execute("SELECT 1 FROM closed_sales LIMIT 1");
  } catch (err) {
    console.error(
      "❌  Tables not found. Start the app at least once first so the schema is created, then re-run this script."
    );
    console.error("   Detail:", err.message);
    process.exit(1);
  }

  await importQueries();
  console.log("");
  await importSales();

  console.log("");
  console.log("🎉  Import complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
