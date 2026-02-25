'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { useRouter } from 'next/navigation';

const SOURCES = ['3CX', 'Email', 'BombinoFB Chat', 'WhatsApp', 'Call', 'Lead email', 'Other'];
const STATUSES = [
  'Pitch In-Progress',
  'Awaiting Response',
  'Pickup Scheduled',
  'Sale Converted',
  'Closed',
  'In Progress',
  'Delivery In Progress',
];

const EMPTY_FORM = {
  date: '',
  source: '',
  name: '',
  contact: '',
  location: '',
  query: '',
  category: '',
  status: '',
  remarks: '',
  response_date: '',
  follow_up: '',
  nxt_follow_up: '',
  awb: '',
  freight_amt: '',
};

function Modal({ title, icon, onClose, onSubmit, form, setForm, loading, mode }) {
  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <i className={icon} style={{ color: 'var(--blue-accent)' }} />
            {title}
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-xmark" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" name="date" value={form.date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select className="form-select" name="source" value={form.source} onChange={handleChange}>
                  <option value="">— Select source —</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" type="text" name="name" placeholder="Customer name" value={form.name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact</label>
                <input className="form-input" type="text" name="contact" placeholder="Phone / email" value={form.contact} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" type="text" name="location" placeholder="City / area" value={form.location} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" type="text" name="category" placeholder="e.g. Mumbai to Dubai" value={form.category} onChange={handleChange} />
              </div>
              <div className="form-group full">
                <label className="form-label">Query</label>
                <textarea className="form-textarea" name="query" placeholder="Customer query details…" value={form.query} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={form.status} onChange={handleChange}>
                  <option value="">— Select status —</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Response Date</label>
                <input className="form-input" type="date" name="response_date" value={form.response_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Follow Up Date</label>
                <input className="form-input" type="date" name="follow_up" value={form.follow_up} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Next Follow Up</label>
                <input className="form-input" type="date" name="nxt_follow_up" value={form.nxt_follow_up} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">AWB</label>
                <input className="form-input" type="text" name="awb" placeholder="Airway bill number" value={form.awb} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Freight Amount (₹)</label>
                <input className="form-input" type="number" name="freight_amt" placeholder="0.00" value={form.freight_amt} onChange={handleChange} />
              </div>
              <div className="form-group full">
                <label className="form-label">Remarks</label>
                <textarea className="form-textarea" name="remarks" placeholder="Internal notes / remarks…" value={form.remarks} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              ) : (
                <><i className="fas fa-floppy-disk" /> {mode === 'edit' ? 'Update Query' : 'Add Query'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ row, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fas fa-triangle-exclamation" style={{ color: '#ff8080' }} />
            Delete Query
          </div>
          <button className="modal-close" onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete the query for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{row?.name || 'this entry'}</strong>?
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Deleting…</> : <><i className="fas fa-trash" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QueriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState('viewer');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUserRole(d.user.role);
      else router.push('/login');
    });
  }, [router]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(sourceFilter && { source: sourceFilter }),
      });
      const res = await fetch(`/api/queries?${params}`);
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter, router]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 300);
    return () => clearTimeout(t);
  }, [fetchRows]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter, sourceFilter]);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setModal('add');
  }

  function openEdit(row) {
    setEditRow(row);
    setForm({
      date: row.date || '',
      source: row.source || '',
      name: row.name || '',
      contact: row.contact || '',
      location: row.location || '',
      query: row.query || '',
      category: row.category || '',
      status: row.status || '',
      remarks: row.remarks || '',
      response_date: row.response_date || '',
      follow_up: row.follow_up || '',
      nxt_follow_up: row.nxt_follow_up || '',
      awb: row.awb || '',
      freight_amt: row.freight_amt ?? '',
    });
    setModal('edit');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = modal === 'edit' ? `/api/queries/${editRow.id}` : '/api/queries';
      const method = modal === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save', 'error');
      } else {
        showToast(modal === 'edit' ? 'Query updated!' : 'Query added!', 'success');
        setModal(null);
        fetchRows();
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/queries/${deleteRow.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Query deleted', 'success');
        setDeleteRow(null);
        fetchRows();
      } else {
        const d = await res.json();
        showToast(d.error || 'Delete failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const canEdit = userRole === 'admin' || userRole === 'editor';
  const canDelete = userRole === 'admin';

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* Header */}
        <div className="header-bar glass">
          <div className="page-title">
            <h1><i className="fas fa-file-alt" style={{ marginRight: 10, color: 'var(--blue-accent)' }} />Query Explorer</h1>
            <p>
              <i className="fas fa-database" />
              {total.toLocaleString()} total entries
            </p>
          </div>
          <div className="header-actions">
            {canEdit && (
              <button className="btn btn-primary" onClick={openAdd}>
                <i className="fas fa-plus" />
                Add Query
              </button>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="glass table-card">
          {/* Filters */}
          <div className="table-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="table-title">
              <i className="fas fa-list-ul" />
              All Queries
            </span>
            <div className="table-actions" style={{ flexWrap: 'wrap' }}>
              <div className="search-wrapper">
                <i className="fas fa-search search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search name, contact, query…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="filter-select"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="">All Sources</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={fetchRows}>
                <i className="fas fa-sync-alt" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div className="empty-state">
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                <p>Loading queries…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><i className="fas fa-inbox" /></div>
                <p>No queries found. {canEdit && <button onClick={openAdd} style={{ background: 'none', border: 'none', color: 'var(--blue-accent)', cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}>Add first query →</button>}</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Follow Up</th>
                    <th>AWB</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.date || '—'}</td>
                      <td>{row.source || '—'}</td>
                      <td className="primary">{row.name || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.contact || '—'}</td>
                      <td>{row.location || '—'}</td>
                      <td title={row.category}>{row.category ? row.category.slice(0, 22) + (row.category.length > 22 ? '…' : '') : '—'}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td
                        title={row.remarks}
                        style={{ maxWidth: 180, color: 'var(--text-muted)', fontSize: 12 }}
                      >
                        {row.remarks ? row.remarks.slice(0, 30) + (row.remarks.length > 30 ? '…' : '') : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {row.follow_up ? (
                          <span style={{
                            color: new Date(row.follow_up) < new Date() ? '#ff8080' : 'var(--text-secondary)',
                            fontSize: 12,
                          }}>
                            {row.follow_up}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{row.awb || '—'}</td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '5px 9px' }}
                              onClick={() => openEdit(row)}
                              title="Edit"
                            >
                              <i className="fas fa-pen" />
                            </button>
                            {canDelete && (
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '5px 9px' }}
                                onClick={() => setDeleteRow(row)}
                                title="Delete"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer / pagination */}
          <div className="table-footer">
            <span>
              Showing {rows.length} of {total.toLocaleString()} entries
            </span>
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <i className="fas fa-chevron-left" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button
                    key={p}
                    className={`page-btn${p === page ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal === 'edit' ? 'Edit Query' : 'Add New Query'}
          icon={modal === 'edit' ? 'fas fa-pen' : 'fas fa-plus'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          form={form}
          setForm={setForm}
          loading={saving}
          mode={modal}
        />
      )}

      {/* Delete Confirm */}
      {deleteRow && (
        <DeleteConfirm
          row={deleteRow}
          onClose={() => setDeleteRow(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-circle-check' : toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}`}
              style={{ color: toast.type === 'success' ? '#70e6a0' : toast.type === 'error' ? '#ff8080' : '#4fa6ff', fontSize: 15 }} />
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 8, fontSize: 12 }}>
              <i className="fas fa-xmark" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
