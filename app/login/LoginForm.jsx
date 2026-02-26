"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginForm({
  initialLogoUrl = "",
  initialSiteName = "BOMBINO",
}) {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const logoUrl = initialLogoUrl;
  const siteName = initialSiteName;

  function validate(username, password) {
    const errs = {};
    if (!username || !username.trim()) errs.username = "Username is required";
    if (!password) errs.password = "Password is required";
    return errs;
  }

  async function doLogin(username, password) {
    setServerError("");
    setFieldErrors({});

    const errs = validate(username, password);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(
          data.error || "Login failed. Please check your credentials.",
        );
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setServerError(
        "Network error — please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await doLogin(form.username, form.password);
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((e) => ({ ...e, [field]: undefined }));
    }
    if (serverError) setServerError("");
  }

  const inputStyle = (field) => ({
    paddingRight: field === "password" ? 44 : undefined,
    borderColor: fieldErrors[field] ? "rgba(255,100,100,0.6)" : undefined,
    boxShadow: fieldErrors[field]
      ? "0 0 0 3px rgba(255,100,100,0.1)"
      : undefined,
  });

  return (
    <div className="login-page">
      <div className="login-glow blue" />
      <div className="login-glow purple" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={200}
              height={72}
              style={{
                maxHeight: 72,
                maxWidth: 200,
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: 10,
                marginBottom: 14,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              }}
              unoptimized
            />
          ) : (
            <div className="login-logo-icon">
              <i className="fas fa-cube" />
            </div>
          )}
          <h1>{siteName}</h1>
          <p>query &amp; sales console</p>
        </div>

        {/* Server-level error banner */}
        {serverError && (
          <div className="login-error">
            <i className="fas fa-circle-exclamation" />
            {serverError}
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-user" style={{ marginRight: 6 }} />
              Username
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
              style={inputStyle("username")}
              disabled={loading}
              required
            />
            {fieldErrors.username && (
              <span
                style={{
                  display: "block",
                  marginTop: 5,
                  fontSize: 11.5,
                  color: "#ff8080",
                }}
              >
                <i
                  className="fas fa-circle-exclamation"
                  style={{ marginRight: 5 }}
                />
                {fieldErrors.username}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-lock" style={{ marginRight: 6 }} />
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                style={inputStyle("password")}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                disabled={loading}
                title={showPass ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text2)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 13,
                  padding: 0,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <i className={`fas fa-eye${showPass ? "-slash" : ""}`} />
              </button>
            </div>
            {fieldErrors.password && (
              <span
                style={{
                  display: "block",
                  marginTop: 5,
                  fontSize: 11.5,
                  color: "#ff8080",
                }}
              >
                <i
                  className="fas fa-circle-exclamation"
                  style={{ marginRight: 5 }}
                />
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? (
              <>
                <span
                  className="spinner"
                  style={{ width: 16, height: 16, marginRight: 8 }}
                />
                Signing in…
              </>
            ) : (
              <>
                <i
                  className="fas fa-right-to-bracket"
                  style={{ marginRight: 8 }}
                />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p
            style={{
              color: "var(--text3)",
              fontSize: 11.5,
              textAlign: "center",
            }}
          >
            <i
              className="fas fa-shield-halved"
              style={{ marginRight: 5, opacity: 0.5 }}
            />
            Bombino Express · Internal CRM
          </p>
        </div>
      </div>
    </div>
  );
}
