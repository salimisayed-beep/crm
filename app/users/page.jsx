"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

const ROLES = ["admin", "manager", "editor", "viewer"];

const ROLE_META = {
  admin: {
    color: "#70e6a0",
    bg: "rgba(112,230,160,0.12)",
    border: "rgba(112,230,160,0.25)",
    icon: "fas fa-crown",
    badge: "badge-admin",
    perms: {
      View: true,
      Add: true,
      Edit: true,
      Delete: true,
      Users: true,
      Schema: true,
    },
    desc: "Full access — add, edit, delete, manage users & schema",
  },
  manager: {
    color: "#ffb44a",
    bg: "rgba(255,180,74,0.12)",
    border: "rgba(255,180,74,0.25)",
    icon: "fas fa-user-tie",
    badge: "badge-manager",
    perms: {
      View: true,
      Add: true,
      Edit: true,
      Delete: false,
      Users: false,
      Schema: true,
    },
    desc: "Can add, edit and use schema editor — cannot delete or manage users",
  },
  editor: {
    color: "#c07df5",
    bg: "rgba(192,125,245,0.12)",
    border: "rgba(192,125,245,0.25)",
    icon: "fas fa-user-pen",
    badge: "badge-editor",
    perms: {
      View: true,
      Add: true,
      Edit: true,
      Delete: false,
      Users: false,
      Schema: false,
    },
    desc: "Can add and edit entries — cannot delete or access schema",
  },
  viewer: {
    color: "#a5a5c0",
    bg: "rgba(165,165,192,0.12)",
    border: "rgba(165,165,192,0.25)",
    icon: "fas fa-eye",
    badge: "badge-viewer",
    perms: {
      View: true,
      Add: false,
      Edit: false,
      Delete: false,
      Users: false,
      Schema: false,
    },
    desc: "Read-only access — cannot make any changes",
  },
};

const EMPTY_ADD_FORM = { username: "", password: "", role: "viewer" };
const EMPTY_EDIT_FORM = { password: "", role: "viewer" };

/* ── Add User Modal ────────────────────────────────────────────────────── */
function AddUserModal({ onClose, onSubmit, form, setForm, loading }) {
  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }
  const meta = ROLE_META[form.role] || ROLE_META.viewer;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fas fa-user-plus" style={{ color: "#ffb44a" }} />
            Add New User
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-xmark" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-1">
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-user" style={{ marginRight: 5 }} />{" "}
                  Username
                </label>
                <input
                  className="form-input"
                  type="text"
                  name="username"
                  placeholder="e.g. john.doe"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-lock" style={{ marginRight: 5 }} />{" "}
                  Password
                </label>
                <input
                  className="form-input"
                  type="text"
                  name="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <i
                    className="fas fa-shield-halved"
                    style={{ marginRight: 5 }}
                  />{" "}
                  Role
                </label>
                <select
                  className="form-select"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* role description */}
              <div
                style={{
                  background: `${meta.color}0d`,
                  border: `1px solid ${meta.border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      borderRadius: 99,
                      padding: "3px 10px",
                      fontSize: 11.5,
                      color: meta.color,
                      fontWeight: 700,
                    }}
                  >
                    <i className={meta.icon} style={{ fontSize: 10 }} />
                    {form.role}
                  </span>
                  <span style={{ color: "var(--text2)", fontSize: 12 }}>
                    {meta.desc}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(meta.perms).map(([label, allowed]) => (
                    <span
                      key={label}
                      style={{
                        fontSize: 10.5,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: allowed
                          ? "rgba(112,230,160,0.1)"
                          : "rgba(255,255,255,0.04)",
                        color: allowed ? "#70e6a0" : "var(--text3)",
                        border: `1px solid ${allowed ? "rgba(112,230,160,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <i
                        className={`fas ${allowed ? "fa-check" : "fa-xmark"}`}
                        style={{ marginRight: 4, fontSize: 8 }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} />{" "}
                  Creating…
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus" /> Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit User Modal ───────────────────────────────────────────────────── */
function EditUserModal({ user, onClose, onSubmit, form, setForm, loading }) {
  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }
  const meta = ROLE_META[form.role] || ROLE_META.viewer;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fas fa-user-pen" style={{ color: "#4fa6ff" }} />
            Edit User —{" "}
            <span style={{ color: "var(--text2)", fontWeight: 400 }}>
              @{user?.username}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-xmark" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-1">
              <div className="form-group">
                <label className="form-label">
                  <i
                    className="fas fa-shield-halved"
                    style={{ marginRight: 5 }}
                  />{" "}
                  Role
                </label>
                <select
                  className="form-select"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* role preview */}
              <div
                style={{
                  background: `${meta.color}0d`,
                  border: `1px solid ${meta.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(meta.perms).map(([label, allowed]) => (
                    <span
                      key={label}
                      style={{
                        fontSize: 10.5,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: allowed
                          ? "rgba(112,230,160,0.1)"
                          : "rgba(255,255,255,0.04)",
                        color: allowed ? "#70e6a0" : "var(--text3)",
                        border: `1px solid ${allowed ? "rgba(112,230,160,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <i
                        className={`fas ${allowed ? "fa-check" : "fa-xmark"}`}
                        style={{ marginRight: 4, fontSize: 8 }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-key" style={{ marginRight: 5 }} /> New
                  Password
                  <span
                    style={{
                      color: "var(--text3)",
                      fontWeight: 400,
                      marginLeft: 6,
                      fontSize: 11,
                    }}
                  >
                    (leave blank to keep current)
                  </span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  name="password"
                  placeholder="Enter new password or leave blank"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} />{" "}
                  Saving…
                </>
              ) : (
                <>
                  <i className="fas fa-floppy-disk" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete Confirm ────────────────────────────────────────────────────── */
function DeleteConfirm({ user, onClose, onConfirm, loading, currentUser }) {
  const isSelf = currentUser?.username === user?.username;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">
            <i
              className="fas fa-triangle-exclamation"
              style={{ color: "#ff8080" }}
            />
            Remove User
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div className="modal-body">
          {isSelf ? (
            <div className="login-error">
              <i className="fas fa-circle-exclamation" /> You cannot delete your
              own account.
            </div>
          ) : (
            <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6 }}>
              Are you sure you want to remove{" "}
              <strong style={{ color: "var(--text)" }}>
                @{user?.username}
              </strong>{" "}
              ({user?.role})? This action cannot be undone.
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {!isSelf && (
            <button
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} />{" "}
                  Removing…
                </>
              ) : (
                <>
                  <i className="fas fa-trash" /> Remove User
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ══════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

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
        setCurrentUser(d.user);
      });
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (currentUser) fetchUsers();
  }, [currentUser, fetchUsers]);

  /* ── add user ─────────────────────────────────────────────────────── */
  async function handleAddUser(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create user", "error");
      } else {
        showToast(
          `User @${data.user.username} created successfully!`,
          "success",
        );
        setShowAdd(false);
        setAddForm(EMPTY_ADD_FORM);
        fetchUsers();
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── edit user ────────────────────────────────────────────────────── */
  function openEdit(u) {
    setEditUser(u);
    setEditForm({ password: "", role: u.role });
  }

  async function handleEditUser(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { role: editForm.role };
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update user", "error");
      } else {
        showToast(`@${editUser.username} updated successfully!`, "success");
        setEditUser(null);
        fetchUsers();
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── delete user ──────────────────────────────────────────────────── */
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`User @${deleteUser.username} removed`, "success");
        setDeleteUser(null);
        fetchUsers();
      } else {
        const d = await res.json();
        showToast(d.error || "Delete failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (str) =>
    str
      ? new Date(str).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const permSummary = (role) => {
    const p = ROLE_META[role]?.perms || {};
    const allowed = Object.entries(p)
      .filter(([, v]) => v)
      .map(([k]) => k);
    return allowed.join(" + ");
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
                className="fas fa-users-cog"
                style={{ marginRight: 10, color: "#ffb44a" }}
              />
              Admin Users
            </h1>
            <p>
              <i className="fas fa-shield-halved" />
              Manage access · {users.length} user{users.length !== 1 ? "s" : ""}{" "}
              registered
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                setAddForm(EMPTY_ADD_FORM);
                setShowAdd(true);
              }}
            >
              <i className="fas fa-user-plus" /> Add User
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state glass" style={{ padding: 60 }}>
            <div
              className="spinner"
              style={{ width: 36, height: 36, margin: "0 auto 16px" }}
            />
            <p>Loading users…</p>
          </div>
        ) : (
          <>
            {/* ── User cards ─────────────────────────────────────────── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                gap: 16,
                marginBottom: 28,
              }}
            >
              {users.map((u) => {
                const isSelf = currentUser?.username === u.username;
                const meta = ROLE_META[u.role] || ROLE_META.viewer;
                const initials = u.username.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={u.id}
                    className="glass"
                    style={{
                      padding: "20px 22px",
                      position: "relative",
                      borderColor: isSelf ? "rgba(79,166,255,0.25)" : undefined,
                    }}
                  >
                    {/* YOU badge */}
                    {isSelf && (
                      <div
                        style={{
                          position: "absolute",
                          top: 13,
                          right: 13,
                          background: "rgba(79,166,255,0.12)",
                          border: "1px solid rgba(79,166,255,0.28)",
                          borderRadius: 99,
                          padding: "2px 9px",
                          fontSize: 9.5,
                          color: "#4fa6ff",
                          fontWeight: 700,
                        }}
                      >
                        YOU
                      </div>
                    )}

                    {/* avatar + name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 13,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}11)`,
                          border: `1px solid ${meta.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          fontWeight: 700,
                          color: meta.color,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14.5,
                            color: "var(--text)",
                          }}
                        >
                          @{u.username}
                        </div>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: meta.bg,
                            border: `1px solid ${meta.border}`,
                            borderRadius: 99,
                            padding: "2px 9px",
                            fontSize: 11,
                            color: meta.color,
                            fontWeight: 700,
                            marginTop: 4,
                          }}
                        >
                          <i className={meta.icon} style={{ fontSize: 9 }} />
                          {u.role}
                        </span>
                      </div>
                    </div>

                    {/* joined */}
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--text3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginBottom: 14,
                      }}
                    >
                      <i
                        className="fas fa-calendar-plus"
                        style={{ fontSize: 10 }}
                      />
                      Joined: {formatDate(u.created_at)}
                    </div>

                    {/* permissions */}
                    <div
                      style={{
                        display: "flex",
                        gap: 5,
                        flexWrap: "wrap",
                        marginBottom: 16,
                      }}
                    >
                      {Object.entries(meta.perms).map(([label, allowed]) => (
                        <span
                          key={label}
                          style={{
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 99,
                            background: allowed
                              ? "rgba(112,230,160,0.09)"
                              : "rgba(255,255,255,0.03)",
                            color: allowed ? "#70e6a0" : "var(--text3)",
                            border: `1px solid ${allowed ? "rgba(112,230,160,0.18)" : "rgba(255,255,255,0.05)"}`,
                          }}
                        >
                          <i
                            className={`fas ${allowed ? "fa-check" : "fa-xmark"}`}
                            style={{ marginRight: 3, fontSize: 7 }}
                          />
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => openEdit(u)}
                      >
                        <i className="fas fa-pen" /> Edit
                      </button>
                      {!isSelf && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ flex: 1, justifyContent: "center" }}
                          onClick={() => setDeleteUser(u)}
                        >
                          <i className="fas fa-trash" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── All users table ──────────────────────────────────────── */}
            <div className="glass table-card">
              <div className="table-header">
                <span className="table-title">
                  <i className="fas fa-table" /> All Users
                </span>
                <button className="btn btn-ghost btn-sm" onClick={fetchUsers}>
                  <i className="fas fa-sync-alt" />
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Permissions</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => {
                      const isSelf = currentUser?.username === u.username;
                      const meta = ROLE_META[u.role] || ROLE_META.viewer;
                      return (
                        <tr key={u.id}>
                          <td style={{ color: "var(--text3)", fontSize: 11 }}>
                            {idx + 1}
                          </td>
                          <td className="primary">
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              @{u.username}
                              {isSelf && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    background: "rgba(79,166,255,0.12)",
                                    border: "1px solid rgba(79,166,255,0.25)",
                                    borderRadius: 99,
                                    padding: "1px 6px",
                                    color: "#4fa6ff",
                                    fontWeight: 700,
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                background: meta.bg,
                                border: `1px solid ${meta.border}`,
                                borderRadius: 99,
                                padding: "2px 9px",
                                fontSize: 11,
                                color: meta.color,
                                fontWeight: 700,
                              }}
                            >
                              <i
                                className={meta.icon}
                                style={{ fontSize: 9 }}
                              />
                              {u.role}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text2)" }}>
                            {permSummary(u.role)}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text3)" }}>
                            {formatDate(u.created_at)}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: "4px 10px" }}
                                onClick={() => openEdit(u)}
                              >
                                <i className="fas fa-pen" /> Edit
                              </button>
                              {!isSelf ? (
                                <button
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: "4px 10px" }}
                                  onClick={() => setDeleteUser(u)}
                                >
                                  <i className="fas fa-trash" /> Remove
                                </button>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text3)",
                                    padding: "4px 6px",
                                  }}
                                >
                                  <i
                                    className="fas fa-lock"
                                    style={{ marginRight: 4 }}
                                  />
                                  Current session
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>
                  {users.length} user{users.length !== 1 ? "s" : ""} total
                </span>
                <span style={{ color: "var(--text3)", fontSize: 11 }}>
                  <i
                    className="fas fa-shield-halved"
                    style={{ marginRight: 5 }}
                  />
                  Admin access required to manage users
                </span>
              </div>
            </div>

            {/* ── Role reference ──────────────────────────────────────── */}
            <div
              className="glass"
              style={{ padding: "18px 22px", marginTop: 20 }}
            >
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text2)",
                  marginBottom: 14,
                }}
              >
                <i
                  className="fas fa-circle-info"
                  style={{ marginRight: 7, color: "#4fa6ff" }}
                />
                Role Reference
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {ROLES.map((role) => {
                  const m = ROLE_META[role];
                  return (
                    <div
                      key={role}
                      style={{
                        flex: "1 1 200px",
                        background: `${m.color}0a`,
                        border: `1px solid ${m.border}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            background: m.bg,
                            border: `1px solid ${m.border}`,
                            borderRadius: 99,
                            padding: "2px 10px",
                            fontSize: 11.5,
                            color: m.color,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <i className={m.icon} style={{ fontSize: 10 }} />{" "}
                          {role}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: "var(--text3)",
                          lineHeight: 1.5,
                          marginBottom: 10,
                        }}
                      >
                        {m.desc}
                      </p>
                      <div
                        style={{ display: "flex", gap: 5, flexWrap: "wrap" }}
                      >
                        {Object.entries(m.perms).map(([label, allowed]) => (
                          <span
                            key={label}
                            style={{
                              fontSize: 10,
                              padding: "2px 7px",
                              borderRadius: 99,
                              background: allowed
                                ? "rgba(112,230,160,0.09)"
                                : "rgba(255,255,255,0.03)",
                              color: allowed ? "#70e6a0" : "var(--text3)",
                              border: `1px solid ${allowed ? "rgba(112,230,160,0.18)" : "rgba(255,255,255,0.05)"}`,
                            }}
                          >
                            <i
                              className={`fas ${allowed ? "fa-check" : "fa-xmark"}`}
                              style={{ marginRight: 3, fontSize: 7 }}
                            />
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Add User Modal ──────────────────────────────────────────────── */}
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSubmit={handleAddUser}
          form={addForm}
          setForm={setAddForm}
          loading={saving}
        />
      )}

      {/* ── Edit User Modal ─────────────────────────────────────────────── */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSubmit={handleEditUser}
          form={editForm}
          setForm={setEditForm}
          loading={saving}
        />
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────── */}
      {deleteUser && (
        <DeleteConfirm
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDelete}
          loading={deleting}
          currentUser={currentUser}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <i
              className={`fas ${
                toast.type === "success"
                  ? "fa-circle-check"
                  : toast.type === "error"
                    ? "fa-circle-exclamation"
                    : "fa-circle-info"
              }`}
              style={{
                color:
                  toast.type === "success"
                    ? "#70e6a0"
                    : toast.type === "error"
                      ? "#ff8080"
                      : "#4fa6ff",
                fontSize: 15,
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
                marginLeft: 8,
                fontSize: 12,
              }}
            >
              <i className="fas fa-xmark" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
