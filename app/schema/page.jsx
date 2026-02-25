"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

const FIELD_TYPE_META = {
  text: { label: "Text", icon: "fas fa-font", color: "#4fa6ff" },
  textarea: { label: "Textarea", icon: "fas fa-align-left", color: "#c07df5" },
  number: { label: "Number", icon: "fas fa-hashtag", color: "#70e6a0" },
  date: { label: "Date", icon: "fas fa-calendar-days", color: "#ffb44a" },
  select: { label: "Select", icon: "fas fa-list-ul", color: "#ff8080" },
};

const EMPTY_NEW_FIELD = {
  label: "",
  field_type: "text",
  options: [],
  is_required: false,
};

/* ── tiny toast ─────────────────────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);
  return { toast, show };
}

/* ── options editor panel ────────────────────────────────────────────────── */
function OptionsPanel({ field, onSave, onClose }) {
  const [opts, setOpts] = useState(field.options ? [...field.options] : []);
  const [newOpt, setNewOpt] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const inputRef = useRef(null);

  function addOption() {
    const v = newOpt.trim();
    if (!v) return;
    if (opts.includes(v)) return;
    setOpts((p) => [...p, v]);
    setNewOpt("");
    inputRef.current?.focus();
  }

  function removeOption(idx) {
    setOpts((p) => p.filter((_, i) => i !== idx));
  }

  function startEdit(idx) {
    setEditIdx(idx);
    setEditVal(opts[idx]);
  }

  function commitEdit(idx) {
    const v = editVal.trim();
    if (v && v !== opts[idx]) {
      setOpts((p) => p.map((o, i) => (i === idx ? v : o)));
    }
    setEditIdx(null);
    setEditVal("");
  }

  /* drag-drop */
  function onDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e, idx) {
    e.preventDefault();
    setDragOver(idx);
  }
  function onDrop(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const arr = [...opts];
    const [item] = arr.splice(dragIdx, 1);
    arr.splice(idx, 0, item);
    setOpts(arr);
    setDragIdx(null);
    setDragOver(null);
  }
  function onDragEnd() {
    setDragIdx(null);
    setDragOver(null);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fas fa-list-ul" style={{ color: "#ff8080" }} />
            Options —{" "}
            <span style={{ color: "var(--text2)", fontWeight: 400 }}>
              {field.label}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="modal-body">
          {/* options list */}
          <div style={{ marginBottom: 16 }}>
            {opts.length === 0 && (
              <div
                style={{
                  color: "var(--text3)",
                  fontSize: 12.5,
                  padding: "12px 0",
                  textAlign: "center",
                }}
              >
                No options yet — add one below
              </div>
            )}
            {opts.map((opt, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={(e) => onDrop(e, idx)}
                onDragEnd={onDragEnd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 8,
                  marginBottom: 4,
                  background:
                    dragOver === idx
                      ? "rgba(79,166,255,0.08)"
                      : "rgba(255,255,255,0.03)",
                  border: `1px solid ${dragOver === idx ? "rgba(79,166,255,0.25)" : "rgba(255,255,255,0.06)"}`,
                  cursor: "grab",
                  transition: "all 0.12s",
                  opacity: dragIdx === idx ? 0.4 : 1,
                }}
              >
                <i
                  className="fas fa-grip-vertical"
                  style={{ color: "var(--text3)", fontSize: 11, flexShrink: 0 }}
                />

                {editIdx === idx ? (
                  <input
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onBlur={() => commitEdit(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(idx);
                      if (e.key === "Escape") setEditIdx(null);
                    }}
                    style={{
                      flex: 1,
                      background: "rgba(79,166,255,0.07)",
                      border: "1px solid rgba(79,166,255,0.3)",
                      borderRadius: 6,
                      padding: "3px 8px",
                      color: "var(--text)",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>
                    {opt}
                  </span>
                )}

                <button
                  onClick={() => startEdit(idx)}
                  title="Rename"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text3)",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "2px 4px",
                  }}
                >
                  <i className="fas fa-pen" />
                </button>
                <button
                  onClick={() => removeOption(idx)}
                  title="Remove"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff8080aa",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "2px 4px",
                  }}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            ))}
          </div>

          {/* add new option */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              className="form-input"
              placeholder="New option label…"
              value={newOpt}
              onChange={(e) => setNewOpt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={addOption}
              style={{ flexShrink: 0 }}
            >
              <i className="fas fa-plus" /> Add
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-success" onClick={() => onSave(opts)}>
            <i className="fas fa-floppy-disk" /> Save Options
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── field row ───────────────────────────────────────────────────────────── */
function FieldRow({
  field,
  index,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onLabelChange,
  onLabelBlur,
  onToggleVisible,
  onToggleRequired,
  onOpenOptions,
  onDelete,
  editingLabel,
  editLabelValue,
  onEditLabelChange,
  onStartEditLabel,
}) {
  const meta = FIELD_TYPE_META[field.field_type] || FIELD_TYPE_META.text;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        marginBottom: 4,
        background: isDragOver
          ? "rgba(79,166,255,0.07)"
          : field.visible
            ? "rgba(255,255,255,0.025)"
            : "rgba(255,255,255,0.01)",
        border: `1px solid ${isDragOver ? "rgba(79,166,255,0.3)" : "rgba(255,255,255,0.06)"}`,
        opacity: isDragging ? 0.35 : field.visible ? 1 : 0.45,
        cursor: "grab",
        transition: "all 0.12s",
      }}
    >
      {/* drag handle */}
      <i
        className="fas fa-grip-vertical"
        style={{
          color: "var(--text3)",
          fontSize: 12,
          flexShrink: 0,
          cursor: "grab",
        }}
      />

      {/* type badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          flexShrink: 0,
          background: `${meta.color}18`,
          border: `1px solid ${meta.color}33`,
          borderRadius: 6,
          padding: "2px 8px",
          fontSize: 10.5,
          color: meta.color,
          fontWeight: 600,
        }}
      >
        <i className={meta.icon} style={{ fontSize: 9 }} />
        {meta.label}
      </span>

      {/* label (inline edit) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingLabel ? (
          <input
            autoFocus
            value={editLabelValue}
            onChange={onEditLabelChange}
            onBlur={onLabelBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLabelBlur();
              if (e.key === "Escape") onLabelBlur(true);
            }}
            style={{
              width: "100%",
              background: "rgba(79,166,255,0.07)",
              border: "1px solid rgba(79,166,255,0.3)",
              borderRadius: 6,
              padding: "3px 8px",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
            }}
          />
        ) : (
          <span
            onClick={onStartEditLabel}
            title="Click to rename"
            style={{
              fontSize: 13,
              color: "var(--text)",
              cursor: "text",
              display: "block",
              padding: "2px 4px",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {field.label}
            {field.is_required && (
              <span style={{ color: "#ff8080", marginLeft: 4, fontSize: 10 }}>
                ✱
              </span>
            )}
          </span>
        )}
      </div>

      {/* field_key hint */}
      <span
        style={{
          fontSize: 10,
          color: "var(--text3)",
          fontFamily: "monospace",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 4,
          padding: "1px 5px",
          flexShrink: 0,
          maxWidth: 100,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {field.field_key}
      </span>

      {/* options button — only for select */}
      {field.field_type === "select" && (
        <button
          onClick={onOpenOptions}
          title="Edit dropdown options"
          style={{
            background: "rgba(255,128,128,0.08)",
            border: "1px solid rgba(255,128,128,0.2)",
            borderRadius: 6,
            padding: "3px 9px",
            color: "#ff8080",
            fontSize: 11,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <i className="fas fa-sliders" style={{ fontSize: 10 }} />
          {(field.options || []).length} opts
        </button>
      )}

      {/* required toggle */}
      <button
        onClick={onToggleRequired}
        title={field.is_required ? "Mark optional" : "Mark required"}
        style={{
          background: field.is_required
            ? "rgba(255,180,74,0.1)"
            : "transparent",
          border: `1px solid ${field.is_required ? "rgba(255,180,74,0.3)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 6,
          padding: "3px 7px",
          color: field.is_required ? "#ffb44a" : "var(--text3)",
          fontSize: 10,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <i className="fas fa-asterisk" />
      </button>

      {/* visibility toggle */}
      <button
        onClick={onToggleVisible}
        title={field.visible ? "Hide field" : "Show field"}
        style={{
          background: field.visible
            ? "rgba(112,230,160,0.08)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${field.visible ? "rgba(112,230,160,0.2)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 6,
          padding: "3px 7px",
          color: field.visible ? "#70e6a0" : "var(--text3)",
          fontSize: 11,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <i className={field.visible ? "fas fa-eye" : "fas fa-eye-slash"} />
      </button>

      {/* core badge OR delete */}
      {field.is_core ? (
        <span
          style={{
            fontSize: 9.5,
            color: "var(--text3)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 4,
            padding: "2px 6px",
            flexShrink: 0,
          }}
        >
          CORE
        </span>
      ) : (
        <button
          onClick={onDelete}
          title="Delete custom field"
          style={{
            background: "rgba(255,100,100,0.07)",
            border: "1px solid rgba(255,100,100,0.15)",
            borderRadius: 6,
            padding: "3px 7px",
            color: "#ff8080aa",
            fontSize: 11,
            cursor: "pointer",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ff8080";
            e.currentTarget.style.background = "rgba(255,100,100,0.14)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#ff8080aa";
            e.currentTarget.style.background = "rgba(255,100,100,0.07)";
          }}
        >
          <i className="fas fa-trash" />
        </button>
      )}
    </div>
  );
}

/* ═══ MAIN PAGE ═══════════════════════════════════════════════════════════ */
export default function SchemaPage() {
  const router = useRouter();
  const { toast, show: showToast } = useToast();

  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [userRole, setUserRole] = useState(null);

  /* drag-drop state */
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  /* inline label edit */
  const [editingKey, setEditingKey] = useState(null);
  const [editLabelVal, setEditLabelVal] = useState("");

  /* options panel */
  const [optionsField, setOptionsField] = useState(null);

  /* add field panel */
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newField, setNewField] = useState(EMPTY_NEW_FIELD);
  const [newOpt, setNewOpt] = useState("");
  const [addingField, setAddingField] = useState(false);

  /* auth check */
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        if (!["admin", "manager"].includes(d.user.role)) {
          router.push("/dashboard");
          return;
        }
        setUserRole(d.user.role);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  /* fetch schema */
  const fetchSchema = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schema");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setFields(data.fields || []);
      setHasChanges(false);
    } catch (e) {
      showToast("Failed to load schema", "error");
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    if (userRole) fetchSchema();
  }, [userRole, fetchSchema]);

  /* ── mark dirty ─────────────────────────────────────────────────────── */
  function markChanged(updater) {
    setFields(updater);
    setHasChanges(true);
  }

  /* ── drag-drop ──────────────────────────────────────────────────────── */
  function handleDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(idx);
  }
  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOver(null);
      return;
    }
    markChanged((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    setDragIdx(null);
    setDragOver(null);
  }
  function handleDragEnd() {
    setDragIdx(null);
    setDragOver(null);
  }

  /* ── label edit ─────────────────────────────────────────────────────── */
  function startEditLabel(key, currentLabel) {
    setEditingKey(key);
    setEditLabelVal(currentLabel);
  }
  function commitLabel(cancel = false) {
    if (!cancel && editLabelVal.trim()) {
      markChanged((prev) =>
        prev.map((f) =>
          f.field_key === editingKey ? { ...f, label: editLabelVal.trim() } : f,
        ),
      );
    }
    setEditingKey(null);
    setEditLabelVal("");
  }

  /* ── visibility / required ──────────────────────────────────────────── */
  function toggleVisible(key) {
    markChanged((prev) =>
      prev.map((f) =>
        f.field_key === key ? { ...f, visible: !f.visible } : f,
      ),
    );
  }
  function toggleRequired(key) {
    markChanged((prev) =>
      prev.map((f) =>
        f.field_key === key ? { ...f, is_required: !f.is_required } : f,
      ),
    );
  }

  /* ── options save ───────────────────────────────────────────────────── */
  function handleOptionsSave(opts) {
    markChanged((prev) =>
      prev.map((f) =>
        f.field_key === optionsField.field_key ? { ...f, options: opts } : f,
      ),
    );
    setOptionsField(null);
    showToast("Options updated — click Save All to persist", "info");
  }

  /* ── delete custom field ────────────────────────────────────────────── */
  async function handleDeleteField(key) {
    if (
      !confirm("Delete this custom field? All data stored in it will be lost.")
    )
      return;
    try {
      const res = await fetch(`/api/schema/${key}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Delete failed", "error");
        return;
      }
      setFields((prev) => prev.filter((f) => f.field_key !== key));
      showToast("Field deleted", "success");
    } catch {
      showToast("Network error", "error");
    }
  }

  /* ── save all changes ───────────────────────────────────────────────── */
  async function handleSaveAll() {
    setSaving(true);
    try {
      const res = await fetch("/api/schema", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Save failed", "error");
        return;
      }
      setFields(d.fields);
      setHasChanges(false);
      showToast("Schema saved successfully!", "success");
    } catch {
      showToast("Network error while saving", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── add custom field ───────────────────────────────────────────────── */
  function addNewOpt() {
    const v = newOpt.trim();
    if (!v || newField.options.includes(v)) return;
    setNewField((p) => ({ ...p, options: [...p.options, v] }));
    setNewOpt("");
  }
  function removeNewOpt(idx) {
    setNewField((p) => ({
      ...p,
      options: p.options.filter((_, i) => i !== idx),
    }));
  }

  async function handleAddField(e) {
    e.preventDefault();
    if (!newField.label.trim()) {
      showToast("Field label is required", "error");
      return;
    }
    if (newField.field_type === "select" && newField.options.length === 0) {
      showToast("Add at least one option for a select field", "error");
      return;
    }
    setAddingField(true);
    try {
      const res = await fetch("/api/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newField),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Failed to add field", "error");
        return;
      }
      setFields((prev) => [...prev, d.field]);
      setNewField(EMPTY_NEW_FIELD);
      setNewOpt("");
      setShowAddPanel(false);
      showToast(`Field "${d.field.label}" added!`, "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setAddingField(false);
    }
  }

  /* split into core + custom for display */
  const coreFields = fields.filter((f) => f.is_core);
  const customFields = fields.filter((f) => !f.is_core);

  /* ── render ─────────────────────────────────────────────────────────── */
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
          <div style={{ textAlign: "center", color: "var(--text3)" }}>
            <div
              className="spinner"
              style={{ width: 36, height: 36, margin: "0 auto 16px" }}
            />
            <p>Loading schema…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* ── header ─────────────────────────────────────────────────── */}
        <div className="header-bar glass">
          <div className="page-title">
            <h1>
              <i
                className="fas fa-sliders"
                style={{ marginRight: 10, color: "#c07df5" }}
              />
              Query Schema Editor
            </h1>
            <p>
              <i className="fas fa-circle-info" />
              Drag to reorder · click label to rename · toggle visibility
            </p>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost btn-sm" onClick={fetchSchema}>
              <i className="fas fa-rotate" /> Reset
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowAddPanel((v) => !v);
                setNewField(EMPTY_NEW_FIELD);
                setNewOpt("");
              }}
              style={
                showAddPanel
                  ? {
                      background: "rgba(112,230,160,0.1)",
                      borderColor: "rgba(112,230,160,0.3)",
                      color: "#70e6a0",
                    }
                  : {}
              }
            >
              <i className={showAddPanel ? "fas fa-xmark" : "fas fa-plus"} />
              {showAddPanel ? "Cancel" : "Add Field"}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={saving || !hasChanges}
              style={!hasChanges ? { opacity: 0.45 } : {}}
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} />{" "}
                  Saving…
                </>
              ) : (
                <>
                  <i className="fas fa-floppy-disk" /> Save All Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── unsaved banner ─────────────────────────────────────────── */}
        {hasChanges && (
          <div
            style={{
              background: "rgba(255,180,74,0.08)",
              border: "1px solid rgba(255,180,74,0.25)",
              borderRadius: 10,
              padding: "10px 18px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "#ffb44a",
            }}
          >
            <i className="fas fa-triangle-exclamation" />
            You have unsaved changes — click{" "}
            <strong style={{ marginLeft: 4, marginRight: 4 }}>
              Save All Changes
            </strong>{" "}
            to persist them.
          </div>
        )}

        {/* ── add field panel ────────────────────────────────────────── */}
        {showAddPanel && (
          <div
            className="glass"
            style={{
              padding: "22px 24px",
              marginBottom: 24,
              borderColor: "rgba(112,230,160,0.18)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#70e6a0",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="fas fa-plus-circle" />
              Add Custom Field
            </div>

            <form onSubmit={handleAddField}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px auto",
                  gap: 12,
                  marginBottom: 12,
                  alignItems: "end",
                }}
              >
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Field Label</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Priority Level"
                    value={newField.label}
                    onChange={(e) =>
                      setNewField((p) => ({ ...p, label: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Field Type</label>
                  <select
                    className="form-select"
                    value={newField.field_type}
                    onChange={(e) =>
                      setNewField((p) => ({
                        ...p,
                        field_type: e.target.value,
                        options: [],
                      }))
                    }
                  >
                    {Object.entries(FIELD_TYPE_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingBottom: 1,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      fontSize: 12.5,
                      color: "var(--text2)",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newField.is_required}
                      onChange={(e) =>
                        setNewField((p) => ({
                          ...p,
                          is_required: e.target.checked,
                        }))
                      }
                      style={{ accentColor: "#ffb44a", width: 14, height: 14 }}
                    />
                    Required
                  </label>
                </div>
              </div>

              {/* options sub-form for select type */}
              {newField.field_type === "select" && (
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ marginBottom: 6 }}>
                    Dropdown Options
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {newField.options.map((o, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "rgba(255,128,128,0.1)",
                          border: "1px solid rgba(255,128,128,0.2)",
                          borderRadius: 99,
                          padding: "3px 10px",
                          fontSize: 12,
                          color: "#ff8080",
                        }}
                      >
                        {o}
                        <button
                          type="button"
                          onClick={() => removeNewOpt(i)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ff8080",
                            cursor: "pointer",
                            fontSize: 10,
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          <i className="fas fa-xmark" />
                        </button>
                      </span>
                    ))}
                    {newField.options.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--text3)" }}>
                        No options yet
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="Option label…"
                      value={newOpt}
                      onChange={(e) => setNewOpt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addNewOpt();
                        }
                      }}
                      style={{ maxWidth: 260 }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={addNewOpt}
                    >
                      <i className="fas fa-plus" /> Add Option
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowAddPanel(false);
                    setNewField(EMPTY_NEW_FIELD);
                    setNewOpt("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={addingField}
                >
                  {addingField ? (
                    <>
                      <span
                        className="spinner"
                        style={{ width: 13, height: 13 }}
                      />{" "}
                      Adding…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus-circle" /> Add Field
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── legend ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
            fontSize: 11.5,
            color: "var(--text3)",
          }}
        >
          <span>
            <i className="fas fa-grip-vertical" style={{ marginRight: 5 }} />
            Drag to reorder
          </span>
          <span>
            <i className="fas fa-pen" style={{ marginRight: 5 }} />
            Click label to rename
          </span>
          <span>
            <i className="fas fa-eye" style={{ marginRight: 5 }} />
            Toggle visibility
          </span>
          <span>
            <i className="fas fa-asterisk" style={{ marginRight: 5 }} />
            Toggle required
          </span>
          <span>
            <i className="fas fa-sliders" style={{ marginRight: 5 }} />
            Edit dropdown options
          </span>
        </div>

        {/* ── core fields ────────────────────────────────────────────── */}
        <div className="glass table-card" style={{ marginBottom: 20 }}>
          <div className="table-header">
            <span className="table-title">
              <i className="fas fa-lock" style={{ color: "#ffb44a" }} />
              Core Fields
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  fontWeight: 400,
                  marginLeft: 8,
                }}
              >
                ({coreFields.length} fields · labels and options editable ·
                cannot be deleted)
              </span>
            </span>
          </div>
          <div style={{ padding: "8px 16px 16px" }}>
            {coreFields.map((field, i) => {
              // index in full fields array for drag-drop
              const globalIdx = fields.findIndex(
                (f) => f.field_key === field.field_key,
              );
              return (
                <FieldRow
                  key={field.field_key}
                  field={field}
                  index={globalIdx}
                  isDragOver={dragOver === globalIdx}
                  isDragging={dragIdx === globalIdx}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  editingLabel={editingKey === field.field_key}
                  editLabelValue={editLabelVal}
                  onEditLabelChange={(e) => setEditLabelVal(e.target.value)}
                  onLabelBlur={(cancel) => commitLabel(cancel === true)}
                  onStartEditLabel={() =>
                    startEditLabel(field.field_key, field.label)
                  }
                  onToggleVisible={() => toggleVisible(field.field_key)}
                  onToggleRequired={() => toggleRequired(field.field_key)}
                  onOpenOptions={() => setOptionsField(field)}
                  onDelete={() => handleDeleteField(field.field_key)}
                />
              );
            })}
          </div>
        </div>

        {/* ── custom fields ──────────────────────────────────────────── */}
        <div className="glass table-card" style={{ marginBottom: 20 }}>
          <div className="table-header">
            <span className="table-title">
              <i
                className="fas fa-wand-magic-sparkles"
                style={{ color: "#c07df5" }}
              />
              Custom Fields
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  fontWeight: 400,
                  marginLeft: 8,
                }}
              >
                ({customFields.length} fields · fully editable and deletable)
              </span>
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowAddPanel(true);
                setNewField(EMPTY_NEW_FIELD);
              }}
            >
              <i className="fas fa-plus" /> Add Field
            </button>
          </div>
          <div style={{ padding: "8px 16px 16px" }}>
            {customFields.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 0" }}>
                <div className="empty-icon">
                  <i className="fas fa-wand-magic-sparkles" />
                </div>
                <p>
                  No custom fields yet. Click <strong>Add Field</strong> to
                  create one.
                </p>
              </div>
            ) : (
              customFields.map((field) => {
                const globalIdx = fields.findIndex(
                  (f) => f.field_key === field.field_key,
                );
                return (
                  <FieldRow
                    key={field.field_key}
                    field={field}
                    index={globalIdx}
                    isDragOver={dragOver === globalIdx}
                    isDragging={dragIdx === globalIdx}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    editingLabel={editingKey === field.field_key}
                    editLabelValue={editLabelVal}
                    onEditLabelChange={(e) => setEditLabelVal(e.target.value)}
                    onLabelBlur={(cancel) => commitLabel(cancel === true)}
                    onStartEditLabel={() =>
                      startEditLabel(field.field_key, field.label)
                    }
                    onToggleVisible={() => toggleVisible(field.field_key)}
                    onToggleRequired={() => toggleRequired(field.field_key)}
                    onOpenOptions={() => setOptionsField(field)}
                    onDelete={() => handleDeleteField(field.field_key)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── field type guide ───────────────────────────────────────── */}
        <div
          className="glass"
          style={{ padding: "18px 22px", marginBottom: 24 }}
        >
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--text2)",
              marginBottom: 12,
            }}
          >
            <i
              className="fas fa-circle-info"
              style={{ marginRight: 7, color: "#4fa6ff" }}
            />
            Field Type Reference
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(FIELD_TYPE_META).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: `${v.color}0f`,
                  border: `1px solid ${v.color}22`,
                  borderRadius: 8,
                  padding: "6px 12px",
                }}
              >
                <i
                  className={v.icon}
                  style={{ color: v.color, fontSize: 12 }}
                />
                <div>
                  <div
                    style={{ fontSize: 11.5, fontWeight: 700, color: v.color }}
                  >
                    {v.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text3)" }}>
                    {k === "text" && "Single line input"}
                    {k === "textarea" && "Multi-line text block"}
                    {k === "number" && "Numeric value (₹, qty…)"}
                    {k === "date" && "Date picker"}
                    {k === "select" && "Dropdown with options"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── options editor modal ──────────────────────────────────────── */}
      {optionsField && (
        <OptionsPanel
          field={optionsField}
          onSave={handleOptionsSave}
          onClose={() => setOptionsField(null)}
        />
      )}

      {/* ── toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <i
              className={`fas ${toast.type === "success" ? "fa-circle-check" : toast.type === "error" ? "fa-circle-exclamation" : "fa-circle-info"}`}
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
              onClick={() => {}}
              style={{
                background: "none",
                border: "none",
                color: "var(--text3)",
                cursor: "pointer",
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
