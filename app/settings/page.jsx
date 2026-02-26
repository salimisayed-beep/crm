"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { useRouter } from "next/navigation";

const PERIODS = [
  { value: "today", label: "Today", icon: "fas fa-calendar-day" },
  { value: "week", label: "This Week", icon: "fas fa-calendar-week" },
  { value: "month", label: "This Month", icon: "fas fa-calendar-alt" },
  { value: "year", label: "This Year", icon: "fas fa-calendar" },
];

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Settings state
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoSize, setLogoSize] = useState(null); // { w, h }
  const [siteName, setSiteName] = useState("BOMBINO");
  const [reportEmail, setReportEmail] = useState("");

  // Report state
  const [reportPeriod, setReportPeriod] = useState("month");
  const [reportAction, setReportAction] = useState("send");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportEmailInput, setReportEmailInput] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  function showToast(message, type = "info") {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        if (d.user.role !== "admin") {
          router.push("/dashboard");
          return;
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // ── Load settings ───────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      const s = data.settings || {};
      if (s.logo_url) {
        setLogoUrl(s.logo_url);
        setLogoPreview(s.logo_url);
      }
      if (s.site_name) setSiteName(s.site_name);
      if (s.report_email) {
        setReportEmail(s.report_email);
        setReportEmailInput(s.report_email);
      }
    } catch {
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Logo file upload ────────────────────────────────────────────
  function handleLogoFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      return;
    }
    if (file.size > 512 * 1024) {
      showToast("Logo must be under 512 KB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setLogoPreview(dataUrl);
      setLogoUrl(dataUrl);
      // Get image dimensions
      const img = new window.Image();
      img.onload = () =>
        setLogoSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function removeLogo() {
    setLogoUrl("");
    setLogoPreview("");
    setLogoSize(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Save appearance settings ────────────────────────────────────
  async function handleSaveAppearance(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo_url: logoUrl,
          site_name: siteName.trim() || "BOMBINO",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save", "error");
      } else {
        showToast("Appearance settings saved!", "success");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Save report email ───────────────────────────────────────────
  async function handleSaveReportConfig(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_email: reportEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save", "error");
      } else {
        showToast("Report configuration saved!", "success");
        setReportEmailInput(reportEmail);
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Generate / send report ──────────────────────────────────────
  async function handleGenerateReport() {
    const emailToUse = reportEmailInput || reportEmail;
    if (reportAction === "send" && (!emailToUse || !emailToUse.includes("@"))) {
      showToast("Enter a valid email address to send the report", "error");
      return;
    }
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: reportPeriod,
          email: emailToUse,
          action: reportAction,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Report generation failed", "error");
      } else if (reportAction === "preview") {
        setPreviewHtml(data.html || "");
        setShowPreview(true);
      } else {
        showToast(data.message || "Report sent successfully!", "success");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setGeneratingReport(false);
    }
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    win.document.write(previewHtml);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  }

  // ─────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────

  const sectionStyle = {
    background: "var(--glass)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "26px 28px",
    marginBottom: 20,
  };

  const sectionTitleStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="header-bar glass">
          <div className="page-title">
            <h1>
              <i
                className="fas fa-gear"
                style={{ marginRight: 10, color: "var(--blue)" }}
              />
              Settings
            </h1>
            <p>
              <i className="fas fa-shield-halved" />
              Admin only · Appearance, theme, reports
            </p>
          </div>
        </div>

        {loading ? (
          <div className="glass" style={{ padding: 60, textAlign: "center" }}>
            <div
              className="spinner"
              style={{ width: 36, height: 36, margin: "0 auto 16px" }}
            />
            <p style={{ color: "var(--text3)" }}>Loading settings…</p>
          </div>
        ) : (
          <>
            {/* ── APPEARANCE ─────────────────────────────────────── */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <i
                  className="fas fa-palette"
                  style={{ color: "var(--purple)" }}
                />
                Appearance
              </div>

              <form onSubmit={handleSaveAppearance}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 28,
                  }}
                >
                  {/* Logo upload */}
                  <div>
                    <label
                      className="form-label"
                      style={{ display: "block", marginBottom: 10 }}
                    >
                      <i className="fas fa-image" style={{ marginRight: 6 }} />
                      Site Logo
                    </label>

                    {/* Drop zone */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() =>
                        !logoPreview && fileInputRef.current?.click()
                      }
                      style={{
                        border: `2px dashed ${logoPreview ? "var(--blue)" : "var(--border)"}`,
                        borderRadius: 14,
                        padding: logoPreview ? "16px" : "32px 20px",
                        cursor: logoPreview ? "default" : "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        background: logoPreview
                          ? "rgba(79,166,255,0.04)"
                          : "rgba(255,255,255,0.02)",
                        transition: "all 0.2s",
                        minHeight: 120,
                        position: "relative",
                      }}
                    >
                      {logoPreview ? (
                        <>
                          <Image
                            src={logoPreview}
                            alt="Logo preview"
                            width={200}
                            height={64}
                            style={{
                              maxHeight: 64,
                              maxWidth: "100%",
                              objectFit: "contain",
                              borderRadius: 8,
                              width: "auto",
                              height: "auto",
                            }}
                            unoptimized
                          />
                          {logoSize && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text3)",
                                background: "rgba(0,0,0,0.2)",
                                borderRadius: 99,
                                padding: "2px 10px",
                              }}
                            >
                              {logoSize.w} × {logoSize.h} px
                            </div>
                          )}
                          <div
                            style={{ display: "flex", gap: 8, marginTop: 4 }}
                          >
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <i className="fas fa-upload" /> Replace
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={removeLogo}
                            >
                              <i className="fas fa-trash" /> Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              background: "rgba(79,166,255,0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                              color: "var(--blue)",
                            }}
                          >
                            <i className="fas fa-cloud-arrow-up" />
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--text2)",
                                fontWeight: 500,
                              }}
                            >
                              Click or drag & drop
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text3)",
                                marginTop: 3,
                              }}
                            >
                              PNG, JPG, SVG, WebP · max 512 KB
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Hint */}
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        background: "rgba(79,166,255,0.06)",
                        border: "1px solid rgba(79,166,255,0.14)",
                        borderRadius: 9,
                        fontSize: 11,
                        color: "var(--text3)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                      }}
                    >
                      <i
                        className="fas fa-circle-info"
                        style={{
                          color: "var(--blue)",
                          marginTop: 1,
                          flexShrink: 0,
                        }}
                      />
                      <span>
                        Recommended:{" "}
                        <strong style={{ color: "var(--text2)" }}>
                          180 × 40 px
                        </strong>{" "}
                        (horizontal banner) or{" "}
                        <strong style={{ color: "var(--text2)" }}>
                          48 × 48 px
                        </strong>{" "}
                        (square icon). Logo appears in the sidebar and login
                        page.
                      </span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleLogoFile(e.target.files?.[0])}
                    />
                  </div>

                  {/* Site name + theme */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    {/* Site name */}
                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-font" style={{ marginRight: 6 }} />
                        Company / Site Name
                      </label>
                      <input
                        className="form-input"
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="e.g. BOMBINO"
                        maxLength={30}
                      />
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginTop: 4,
                        }}
                      >
                        Shown in sidebar header and reports
                      </div>
                    </div>

                    {/* Theme toggle */}
                    <div className="form-group">
                      <label className="form-label">
                        <i
                          className="fas fa-circle-half-stroke"
                          style={{ marginRight: 6 }}
                        />
                        Interface Theme
                      </label>
                      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        {[
                          { value: "dark", label: "Dark", icon: "fas fa-moon" },
                          {
                            value: "light",
                            label: "Light",
                            icon: "fas fa-sun",
                          },
                        ].map((t) => {
                          const current =
                            typeof document !== "undefined"
                              ? document.documentElement.getAttribute(
                                  "data-theme",
                                ) || "dark"
                              : "dark";
                          const isActive = current === t.value;
                          return (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => {
                                document.documentElement.setAttribute(
                                  "data-theme",
                                  t.value,
                                );
                                try {
                                  localStorage.setItem(
                                    "bombino_theme",
                                    t.value,
                                  );
                                } catch {}
                                // force re-render
                                window.dispatchEvent(new Event("theme-change"));
                              }}
                              style={{
                                flex: 1,
                                padding: "10px",
                                borderRadius: 11,
                                border: `1px solid ${isActive ? "rgba(79,166,255,0.4)" : "var(--border)"}`,
                                background: isActive
                                  ? "rgba(79,166,255,0.12)"
                                  : "rgba(255,255,255,0.03)",
                                color: isActive
                                  ? "var(--blue)"
                                  : "var(--text3)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 7,
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 400,
                                transition: "all 0.18s",
                                fontFamily: "inherit",
                              }}
                            >
                              <i className={t.icon} />
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginTop: 6,
                        }}
                      >
                        <i
                          className="fas fa-info-circle"
                          style={{ marginRight: 4 }}
                        />
                        Theme preference is saved per-browser. Use the sidebar
                        toggle anytime.
                      </div>
                    </div>

                    {/* Save button */}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                      style={{ marginTop: "auto", justifyContent: "center" }}
                    >
                      {saving ? (
                        <>
                          <span
                            className="spinner"
                            style={{ width: 14, height: 14 }}
                          />{" "}
                          Saving…
                        </>
                      ) : (
                        <>
                          <i className="fas fa-floppy-disk" /> Save Appearance
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* ── REPORTS & EMAIL ─────────────────────────────────── */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <i
                  className="fas fa-file-chart-column"
                  style={{ color: "var(--green)" }}
                />
                Reports & Email
              </div>

              {/* Mailgun notice */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,180,74,0.07)",
                  border: "1px solid rgba(255,180,74,0.2)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--text2)",
                  marginBottom: 22,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <i
                  className="fas fa-triangle-exclamation"
                  style={{
                    color: "var(--orange)",
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                />
                <span>
                  Sending reports requires{" "}
                  <strong style={{ color: "var(--orange)" }}>
                    MAILGUN_API_KEY
                  </strong>
                  ,{" "}
                  <strong style={{ color: "var(--orange)" }}>
                    MAILGUN_DOMAIN
                  </strong>
                  , and optionally{" "}
                  <strong style={{ color: "var(--orange)" }}>
                    MAILGUN_FROM
                  </strong>{" "}
                  set in your Vercel environment variables. You can still
                  preview and download reports without Mailgun.
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 28,
                }}
              >
                {/* Left — default email config */}
                <form onSubmit={handleSaveReportConfig}>
                  <div
                    style={{
                      padding: "20px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text2)",
                      }}
                    >
                      <i
                        className="fas fa-envelope"
                        style={{ marginRight: 7, color: "var(--blue)" }}
                      />
                      Default Recipient Email
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        className="form-input"
                        type="email"
                        value={reportEmail}
                        onChange={(e) => setReportEmail(e.target.value)}
                        placeholder="reports@yourcompany.com"
                      />
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginTop: 4,
                        }}
                      >
                        Pre-filled when generating reports. Can be overridden
                        each time.
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm"
                      disabled={saving}
                      style={{ justifyContent: "center", marginTop: "auto" }}
                    >
                      <i className="fas fa-floppy-disk" /> Save Default Email
                    </button>
                  </div>
                </form>

                {/* Right — report generator */}
                <div
                  style={{
                    padding: "20px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text2)",
                    }}
                  >
                    <i
                      className="fas fa-chart-bar"
                      style={{ marginRight: 7, color: "var(--green)" }}
                    />
                    Generate Report
                  </div>

                  {/* Period selector */}
                  <div>
                    <div className="form-label" style={{ marginBottom: 8 }}>
                      Report Period
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {PERIODS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setReportPeriod(p.value)}
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            border: `1px solid ${reportPeriod === p.value ? "rgba(112,230,160,0.4)" : "var(--border)"}`,
                            background:
                              reportPeriod === p.value
                                ? "rgba(112,230,160,0.1)"
                                : "rgba(255,255,255,0.03)",
                            color:
                              reportPeriod === p.value
                                ? "var(--green)"
                                : "var(--text3)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            fontSize: 12,
                            fontWeight: reportPeriod === p.value ? 600 : 400,
                            transition: "all 0.18s",
                            fontFamily: "inherit",
                          }}
                        >
                          <i className={p.icon} style={{ fontSize: 11 }} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email input */}
                  <div className="form-group">
                    <label className="form-label">Send To (email)</label>
                    <input
                      className="form-input"
                      type="email"
                      value={reportEmailInput}
                      onChange={(e) => setReportEmailInput(e.target.value)}
                      placeholder={reportEmail || "recipient@example.com"}
                    />
                  </div>

                  {/* Action toggle */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      {
                        value: "preview",
                        label: "Preview",
                        icon: "fas fa-eye",
                      },
                      {
                        value: "send",
                        label: "Send Email",
                        icon: "fas fa-paper-plane",
                      },
                    ].map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => setReportAction(a.value)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: 9,
                          border: `1px solid ${reportAction === a.value ? "rgba(79,166,255,0.4)" : "var(--border)"}`,
                          background:
                            reportAction === a.value
                              ? "rgba(79,166,255,0.1)"
                              : "rgba(255,255,255,0.02)",
                          color:
                            reportAction === a.value
                              ? "var(--blue)"
                              : "var(--text3)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: reportAction === a.value ? 600 : 400,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontFamily: "inherit",
                          transition: "all 0.18s",
                        }}
                      >
                        <i className={a.icon} />
                        {a.label}
                      </button>
                    ))}
                  </div>

                  {/* Generate button */}
                  <button
                    type="button"
                    className={`btn ${reportAction === "send" ? "btn-primary" : "btn-success"}`}
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    style={{ justifyContent: "center", marginTop: 4 }}
                  >
                    {generatingReport ? (
                      <>
                        <span
                          className="spinner"
                          style={{ width: 14, height: 14 }}
                        />{" "}
                        Generating…
                      </>
                    ) : reportAction === "preview" ? (
                      <>
                        <i className="fas fa-eye" /> Preview Report
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane" /> Generate & Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── DANGER ZONE placeholder ─────────────────────────── */}
            <div
              style={{
                ...sectionStyle,
                borderColor: "rgba(255,107,107,0.18)",
                background: "rgba(255,107,107,0.03)",
              }}
            >
              <div style={{ ...sectionTitleStyle, color: "var(--red)" }}>
                <i className="fas fa-triangle-exclamation" />
                Environment Variables Required
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                  gap: 12,
                }}
              >
                {[
                  {
                    key: "MAILGUN_API_KEY",
                    desc: "Your Mailgun private API key",
                    required: true,
                  },
                  {
                    key: "MAILGUN_DOMAIN",
                    desc: "e.g. mg.yourdomain.com",
                    required: true,
                  },
                  {
                    key: "MAILGUN_FROM",
                    desc: "Sender address — defaults to noreply@domain",
                    required: false,
                  },
                  {
                    key: "JWT_SECRET",
                    desc: "Long random string for session signing",
                    required: true,
                  },
                  {
                    key: "TURSO_DATABASE_URL",
                    desc: "libsql://your-db.turso.io",
                    required: true,
                  },
                  {
                    key: "TURSO_AUTH_TOKEN",
                    desc: "Auth token from Turso dashboard",
                    required: true,
                  },
                ].map((env) => (
                  <div
                    key={env.key}
                    style={{
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border)",
                      borderRadius: 11,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <code
                        style={{
                          fontSize: 11.5,
                          fontFamily: "monospace",
                          color: env.required
                            ? "var(--orange)"
                            : "var(--text2)",
                          background: "rgba(255,255,255,0.05)",
                          padding: "1px 7px",
                          borderRadius: 5,
                        }}
                      >
                        {env.key}
                      </code>
                      {env.required && (
                        <span
                          style={{
                            fontSize: 9,
                            background: "rgba(255,107,107,0.12)",
                            color: "var(--red)",
                            borderRadius: 99,
                            padding: "1px 6px",
                            fontWeight: 700,
                          }}
                        >
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      {env.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Report preview modal ──────────────────────────────── */}
        {showPreview && (
          <div
            className="modal-overlay"
            onClick={(e) =>
              e.target === e.currentTarget && setShowPreview(false)
            }
          >
            <div className="modal" style={{ maxWidth: 780, maxHeight: "92vh" }}>
              <div className="modal-header">
                <div className="modal-title">
                  <i
                    className="fas fa-file-alt"
                    style={{ color: "var(--green)" }}
                  />
                  Report Preview
                </div>
                <button
                  className="modal-close"
                  onClick={() => setShowPreview(false)}
                >
                  <i className="fas fa-xmark" />
                </button>
              </div>
              <div style={{ padding: "0" }}>
                <iframe
                  srcDoc={previewHtml}
                  style={{
                    width: "100%",
                    height: "65vh",
                    border: "none",
                    borderRadius: "0 0 4px 4px",
                  }}
                  title="Report Preview"
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </button>
                <button className="btn btn-success" onClick={handlePrint}>
                  <i className="fas fa-print" /> Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type || "info"}`}>
              <i
                className={
                  toast.type === "success"
                    ? "fas fa-circle-check"
                    : toast.type === "error"
                      ? "fas fa-circle-exclamation"
                      : "fas fa-circle-info"
                }
                style={{
                  color:
                    toast.type === "success"
                      ? "#70e6a0"
                      : toast.type === "error"
                        ? "#ff8080"
                        : "#4fa6ff",
                  fontSize: 15,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text3)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                  marginLeft: 8,
                }}
              >
                <i className="fas fa-xmark" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
