"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useRouter } from "next/navigation";

const STATUS_COLORS = {
  "Sale Converted": "#70e6a0",
  "Pitch In-Progress": "#ffb44a",
  Closed: "#a5a5c0",
  "Awaiting Response": "#c07df5",
  "Pickup Scheduled": "#4fa6ff",
  "In Progress": "#60c8ff",
  Other: "#5d719d",
};

const SOURCE_ICONS = {
  "3CX": "fas fa-phone",
  Email: "fas fa-envelope",
  "Facebook/Chat": "fab fa-facebook",
  WhatsApp: "fab fa-whatsapp",
  Call: "fas fa-phone-volume",
  Other: "fas fa-question-circle",
};

const DEST_FLAGS = {
  USA: "fas fa-flag",
  "United Kingdom": "fas fa-flag",
  "UAE / Dubai": "fas fa-flag",
  Canada: "fas fa-flag",
  Australia: "fas fa-flag",
  "Saudi Arabia": "fas fa-flag",
  Bahrain: "fas fa-flag",
  Qatar: "fas fa-flag",
  Oman: "fas fa-flag",
  Singapore: "fas fa-flag",
  Malaysia: "fas fa-flag",
  Germany: "fas fa-flag",
  France: "fas fa-flag",
  Italy: "fas fa-flag",
  "New Zealand": "fas fa-flag",
  Nepal: "fas fa-flag",
  "Sri Lanka": "fas fa-flag",
  Bangladesh: "fas fa-flag",
  Pakistan: "fas fa-flag",
  "Domestic (India)": "fas fa-map-marker-alt",
  Others: "fas fa-ellipsis-h",
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setStats(data);
      setLastSync(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main
          className="main-content"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div
              className="spinner"
              style={{ width: 36, height: 36, margin: "0 auto 16px" }}
            />
            <p>Loading dashboard…</p>
          </div>
        </main>
      </div>
    );
  }

  const buckets = stats?.statusBuckets || {};
  const maxBucket = Math.max(...Object.values(buckets), 1);

  const totalAmount = stats?.salesStats?.totalAmount || 0;
  const formattedAmount =
    totalAmount >= 100000
      ? `₹${(totalAmount / 100000).toFixed(2)}L`
      : `₹${totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const topDestinations = stats?.topDestinations || [];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="header-bar glass">
          <div className="page-title">
            <h1>📊 Query Sale Dashboard</h1>
            <p>
              <i className="far fa-calendar-alt" />
              Last synced: {lastSync || "—"}
            </p>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost btn-sm" onClick={fetchStats}>
              <i className="fas fa-sync-alt" />
              Refresh
            </button>
            <a href="/queries" className="btn btn-primary btn-sm">
              <i className="fas fa-plus" />
              New Query
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card glass blue">
            <div className="kpi-icon blue">
              <i className="fas fa-file-alt" />
            </div>
            <div className="kpi-label">Total Queries</div>
            <div className="kpi-value">
              {(stats?.totalQueries || 0).toLocaleString()}
            </div>
            <div className="kpi-trend up">
              <i className="fas fa-arrow-up" />
              {stats?.thisMonth || 0} added this month
            </div>
          </div>

          <div className="kpi-card glass green">
            <div className="kpi-icon green">
              <i className="fas fa-check-double" />
            </div>
            <div className="kpi-label">Sale Converted</div>
            <div className="kpi-value">
              {stats?.salesStats?.totalSales || 0}
            </div>
            <div className="kpi-trend up">
              <i className="fas fa-indian-rupee-sign" />
              {formattedAmount} freight amt
            </div>
          </div>

          <div className="kpi-card glass orange">
            <div className="kpi-icon orange">
              <i className="fas fa-bolt" />
            </div>
            <div className="kpi-label">Pitch In-Progress</div>
            <div className="kpi-value">{buckets["Pitch In-Progress"] || 0}</div>
            <div className="kpi-trend">
              <i className="fas fa-circle" style={{ fontSize: 7 }} />
              Actively being worked
            </div>
          </div>

          <div className="kpi-card glass purple">
            <div className="kpi-icon purple">
              <i className="fas fa-bell" />
            </div>
            <div className="kpi-label">Follow-ups Due</div>
            <div className="kpi-value">{stats?.followUpsDue || 0}</div>
            <div
              className={`kpi-trend ${(stats?.followUpsDue || 0) > 0 ? "down" : ""}`}
            >
              <i
                className={`fas ${(stats?.followUpsDue || 0) > 0 ? "fa-triangle-exclamation" : "fa-circle-check"}`}
              />
              {(stats?.followUpsDue || 0) > 0 ? "Needs attention" : "All clear"}
            </div>
          </div>
        </div>

        {/* Status breakdown + Source breakdown + Top Destinations */}
        <div className="insight-panel">
          {/* Status Breakdown */}
          <div className="glass panel-card">
            <div className="panel-title">
              <i className="fas fa-chart-simple" />
              Query Status Breakdown
            </div>
            {Object.entries(buckets).map(([label, count]) => {
              if (!count) return null;
              const pct = Math.round((count / maxBucket) * 100);
              const color = STATUS_COLORS[label] || "#5d719d";
              return (
                <div className="status-row" key={label}>
                  <span className="status-dot" style={{ background: color }} />
                  <span className="status-label">{label}</span>
                  <span className="status-count-badge">{count}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Destinations */}
          <div className="glass panel-card">
            <div className="panel-title">
              <i className="fas fa-globe" />
              Top Destinations
            </div>
            {topDestinations.length > 0 ? (
              topDestinations.map((dest) => {
                const icon = DEST_FLAGS[dest.name] || "fas fa-flag";
                const isOthers = dest.name === "Others";
                return (
                  <div className="dest-item" key={dest.name}>
                    <span className="dest-name">
                      <i
                        className={icon}
                        style={{
                          width: 18,
                          textAlign: "center",
                          color: isOthers
                            ? "var(--text3)"
                            : "var(--blue-accent)",
                          opacity: isOthers ? 0.5 : 0.85,
                          fontSize: isOthers ? 11 : 13,
                        }}
                      />
                      {dest.name}
                    </span>
                    <strong
                      style={{
                        color: isOthers ? "var(--text2)" : "var(--text)",
                      }}
                    >
                      {dest.cnt}
                    </strong>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  paddingTop: 16,
                }}
              >
                No location data yet
              </div>
            )}
          </div>

          {/* Source Breakdown */}
          <div className="glass panel-card">
            <div className="panel-title">
              <i className="fas fa-filter" />
              Leads by Source
            </div>
            {(stats?.sourceBreakdown || []).map((row) => (
              <div className="dest-item" key={row.src}>
                <span className="dest-name">
                  <i
                    className={
                      SOURCE_ICONS[row.src] || "fas fa-question-circle"
                    }
                    style={{
                      width: 18,
                      textAlign: "center",
                      color: "var(--blue-accent)",
                      opacity: 0.7,
                    }}
                  />
                  {row.src}
                </span>
                <strong>{row.cnt}</strong>
              </div>
            ))}
            {!stats?.sourceBreakdown?.length && (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  paddingTop: 16,
                }}
              >
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Queries */}
        <div className="glass table-card">
          <div className="table-header">
            <span className="table-title">
              <i className="fas fa-list-ul" />
              Recent Queries
            </span>
            <a href="/queries" className="btn btn-ghost btn-sm">
              View all <i className="fas fa-arrow-right" />
            </a>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Contact</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentQueries || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.date || "—"}</td>
                    <td className="primary">{row.name || "—"}</td>
                    <td>{row.source || "—"}</td>
                    <td>{row.contact || "—"}</td>
                    <td style={{ maxWidth: 160 }}>{row.category || "—"}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td
                      style={{
                        maxWidth: 200,
                        color: "var(--text-muted)",
                        fontSize: 12,
                      }}
                    >
                      {row.remarks || "—"}
                    </td>
                  </tr>
                ))}
                {!stats?.recentQueries?.length && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-icon">
                          <i className="fas fa-inbox" />
                        </div>
                        <p>
                          No queries yet.{" "}
                          <a
                            href="/queries"
                            style={{ color: "var(--blue-accent)" }}
                          >
                            Add the first one →
                          </a>
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Closed Sales · Freight Amount */}
        <div className="glass table-card">
          <div className="table-header">
            <span className="table-title">
              <i className="fas fa-receipt" />
              Closed Sales · Freight Amount
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Total:{" "}
                <strong style={{ color: "#70e6a0" }}>{formattedAmount}</strong>
              </span>
              <a href="/sales" className="btn btn-ghost btn-sm">
                View all <i className="fas fa-arrow-right" />
              </a>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Query Date</th>
                  <th>Customer</th>
                  <th>Source</th>
                  <th>Location</th>
                  <th>AWB</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentSales || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.query_date || "—"}</td>
                    <td className="primary">{row.name || "—"}</td>
                    <td>{row.source || "—"}</td>
                    <td>{row.location || "—"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {row.awb || "—"}
                    </td>
                    <td>
                      <strong style={{ color: "#70e6a0" }}>
                        {row.amount
                          ? `₹${Number(row.amount).toLocaleString("en-IN")}`
                          : "—"}
                      </strong>
                    </td>
                  </tr>
                ))}
                {!stats?.recentSales?.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon">
                          <i className="fas fa-box-open" />
                        </div>
                        <p>
                          No sales recorded yet.{" "}
                          <a
                            href="/sales"
                            style={{ color: "var(--blue-accent)" }}
                          >
                            Add a sale →
                          </a>
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Showing last 10 entries</span>
            <span>
              <i className="fas fa-database" style={{ marginRight: 5 }} />
              SQLite · Bombino CRM
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
