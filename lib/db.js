/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");

// ─── Client singleton ─────────────────────────────────────────────────────────
let _client = null;
let _initPromise = null;

function getClient() {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "[db] TURSO_DATABASE_URL is not set.\n" +
        "  Local dev  → TURSO_DATABASE_URL=file:./data/bombino.db\n" +
        "  Production → set your Turso libsql:// URL + TURSO_AUTH_TOKEN",
    );
  }

  _client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

  return _client;
}

// ─── Public: get an initialised client ───────────────────────────────────────
async function getDb() {
  const client = getClient();
  if (!_initPromise) _initPromise = runInit(client);
  await _initPromise;
  return client;
}

// ─── Row helpers ──────────────────────────────────────────────────────────────
// Convert a libSQL ResultSet → plain JS objects that the rest of the app expects

function rowToObj(row, columns) {
  const obj = {};
  for (let i = 0; i < columns.length; i++) obj[columns[i]] = row[i];
  return obj;
}

// First row as plain object, or null
function first(rs) {
  if (!rs?.rows?.length) return null;
  return rowToObj(rs.rows[0], rs.columns);
}

// All rows as plain objects
function all(rs) {
  if (!rs?.rows) return [];
  return rs.rows.map((row) => rowToObj(row, rs.columns));
}

// ─── Schema initialisation (idempotent) ───────────────────────────────────────
async function runInit(client) {
  // 1. Create tables
  await client.batch(
    [
      {
        sql: `CREATE TABLE IF NOT EXISTS users (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          username    TEXT UNIQUE NOT NULL,
          password    TEXT NOT NULL,
          role        TEXT NOT NULL DEFAULT 'viewer',
          created_at  TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS queries (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          date           TEXT,
          source         TEXT,
          name           TEXT,
          contact        TEXT,
          location       TEXT,
          query          TEXT,
          category       TEXT,
          status         TEXT,
          remarks        TEXT,
          response_date  TEXT,
          follow_up      TEXT,
          nxt_follow_up  TEXT,
          awb            TEXT,
          freight_amt    REAL,
          custom_fields  TEXT,
          created_at     TEXT DEFAULT (datetime('now')),
          updated_at     TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS closed_sales (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          query_date  TEXT,
          query_no    TEXT,
          name        TEXT,
          source      TEXT,
          contact     TEXT,
          location    TEXT,
          awb         TEXT,
          amount      REAL,
          created_at  TEXT DEFAULT (datetime('now')),
          updated_at  TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS query_schema (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          field_key    TEXT UNIQUE NOT NULL,
          label        TEXT NOT NULL,
          field_type   TEXT NOT NULL DEFAULT 'text',
          options_json TEXT,
          is_core      INTEGER NOT NULL DEFAULT 0,
          is_required  INTEGER NOT NULL DEFAULT 0,
          visible      INTEGER NOT NULL DEFAULT 1,
          sort_order   INTEGER NOT NULL DEFAULT 0,
          created_at   TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
    ],
    "write",
  );

  // 2. Seed default users if table is empty
  const userCountRs = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM users",
    args: [],
  });
  if (Number(userCountRs.rows[0][0]) === 0) {
    const seeds = [
      { username: "admin", password: "bombino@2024", role: "admin" },
      { username: "manager", password: "manager@123", role: "manager" },
      { username: "editor", password: "editor@123", role: "editor" },
      { username: "viewer", password: "viewer@123", role: "viewer" },
    ];
    for (const u of seeds) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.execute({
        sql: "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
        args: [u.username, hash, u.role],
      });
    }
    console.log("[db] Seeded default users");
  }

  // 3. Create settings table
  await client.batch(
    [
      {
        sql: `CREATE TABLE IF NOT EXISTS settings (
          key        TEXT PRIMARY KEY,
          value      TEXT NOT NULL DEFAULT '',
          updated_at TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
    ],
    "write",
  );

  // Seed default settings
  const defaultSettings = [
    { key: "logo_url", value: "" },
    { key: "site_name", value: "BOMBINO" },
    { key: "report_email", value: "" },
  ];
  for (const s of defaultSettings) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      args: [s.key, s.value],
    });
  }

  // 4. Seed query schema if table is empty
  const schemaCountRs = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM query_schema",
    args: [],
  });
  if (Number(schemaCountRs.rows[0][0]) === 0) {
    await seedQuerySchema(client);
  }
}

async function seedQuerySchema(client) {
  const defaultFields = [
    {
      field_key: "date",
      label: "Date",
      field_type: "date",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 0,
    },
    {
      field_key: "source",
      label: "Source",
      field_type: "select",
      options_json: JSON.stringify([
        "3CX",
        "Email",
        "BombinoFB Chat",
        "WhatsApp",
        "Call",
        "Lead Email",
        "Other",
      ]),
      is_core: 1,
      is_required: 0,
      sort_order: 1,
    },
    {
      field_key: "name",
      label: "Customer Name",
      field_type: "text",
      options_json: null,
      is_core: 1,
      is_required: 1,
      sort_order: 2,
    },
    {
      field_key: "contact",
      label: "Contact",
      field_type: "text",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 3,
    },
    {
      field_key: "location",
      label: "Location",
      field_type: "text",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 4,
    },
    {
      field_key: "query",
      label: "Query Details",
      field_type: "textarea",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 5,
    },
    {
      field_key: "category",
      label: "Category",
      field_type: "select",
      options_json: JSON.stringify([
        "Parcel",
        "Document",
        "Excess Baggage",
        "E-Commerce",
        "Air Freight",
        "Sea Freight",
        "Other",
      ]),
      is_core: 1,
      is_required: 0,
      sort_order: 6,
    },
    {
      field_key: "status",
      label: "Status",
      field_type: "select",
      options_json: JSON.stringify([
        "Pitch In-Progress",
        "Awaiting Response",
        "Pickup Scheduled",
        "Sale Converted",
        "In Progress",
        "Closed",
        "Other",
      ]),
      is_core: 1,
      is_required: 0,
      sort_order: 7,
    },
    {
      field_key: "remarks",
      label: "Remarks",
      field_type: "textarea",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 8,
    },
    {
      field_key: "response_date",
      label: "Response Date",
      field_type: "date",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 9,
    },
    {
      field_key: "follow_up",
      label: "Follow-up Date",
      field_type: "date",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 10,
    },
    {
      field_key: "nxt_follow_up",
      label: "Next Follow-up",
      field_type: "date",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 11,
    },
    {
      field_key: "awb",
      label: "AWB Number",
      field_type: "text",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 12,
    },
    {
      field_key: "freight_amt",
      label: "Freight Amount (₹)",
      field_type: "number",
      options_json: null,
      is_core: 1,
      is_required: 0,
      sort_order: 13,
    },
  ];

  for (const f of defaultFields) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO query_schema
              (field_key, label, field_type, options_json, is_core, is_required, visible, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        f.field_key,
        f.label,
        f.field_type,
        f.options_json,
        f.is_core,
        f.is_required,
        f.sort_order,
      ],
    });
  }
  console.log("[db] Seeded default query_schema fields");
}

module.exports = { getDb, first, all };
