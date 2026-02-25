'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

const SOURCES = ['3CX', 'Email', 'BombinoFB Chat', 'WhatsApp', 'Call', 'Lead email', 'Other'];

const EMPTY_FORM = {
  query_date: '',
  query_no: '',
  name: '',
  source: '',
  contact: '',
  location: '',
  awb: '',
  amount: '',
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
            <i className={icon} style={{ color: '#70e6a0' }} />
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
                <label className="form-label">Query Date</label>
                <input
                  className="form-input"
                  type="date"
                  name="query_date"
                  value={form.query_date}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Query # / Description</label>
                <input
                  className="form-input"
                  type="text"
                  name="query_no"
                  placeholder="e.g. clothes food item 30kg"
                  value={form.query_no}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  className="form-input"
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select
                  className="form-select"
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                >
                  <option value="">— Select source —</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contact</label>
                <input
                  className="form-input"
                  type="text"
                  name="contact"
                  placeholder="Phone number"
                  value={form.contact}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location (From → To)</label>
                <input
                  className="form-input"
                  type="text"
                  name="location"
                  placeholder="e.g. Mumbai to UK"
                  value={form.location}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">AWB Number</label>
                <input
                  className="form-input"
                  type="text"
                  name="awb"
                  placeholder="Airway bill number"
                  value={form.awb}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Freight Amount (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  name="amount"
                  placeholder="0.00"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              ) : (
                <><i className="fas fa-floppy-disk" /> {mode === 'edit' ? 'Update Sale' : 'Add Sale'}</>
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
            Delete Sale Entry
          </div>
          <button className="modal-close" onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete the sale for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{row?.name || 'this entry'}</strong>?
            {row?.amount && (
              <> ({row.amount ? `₹${Number(row.amount).toLocaleString('en-IN')}` : ''})</>
            )}
            {' '}This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Deleting…</>
              : <><i className="fas fa-trash" /> Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [modal, setModal] = useState(null);
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
      });
      const res = await fetch(`/api/sales?${params}`);
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setTotalAmount(data.totalAmount || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, router]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 300);
    return () => clearTimeout(t);
  }, [fetchRows]);

  useEffect(() => { setPage(1); }, [search]);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, query_date: new Date().toISOString().split('T')[0] });
    setModal('add');
  }

  function openEdit(row) {
    setEditRow(row);
    setForm({
      query_date: row.query_date || '',
      query_no: row.query_no || '',
      name: row.name || '',
      source: row.source || '',
      contact: row.contact || '',
      location: row.location || '',
      awb: row.awb || '',
      amount: row.amount ?? '',
    });
    setModal('edit');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = modal === 'edit' ? `/api/sales/${editRow.id}` : '/api/sales';
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
        showToast(modal === 'edit' ? 'Sale updated!' : 'Sale added!', 'success');
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
      const res = await fetch(`/api/sales/${deleteRow.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Sale deleted', 'success');
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

  const formattedTotal = totalAmount >= 100000
    ? `₹${(totalAmount / 100000).toFixed(2)}L`
    : `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* Header */}
        <div className="header-bar glass">
          <div className="page-title">
            <h1>
              <i className="fas fa-receipt" style={{ marginRight: 10, color: '#70e6a0' }} />
              Closed Sales
            </h1>
            <p>
              <i className="fas fa-indian-rupee-sign" />
              Total freight collected: <strong style={{ color: '#70e6a0', marginLeft: 4 }}>{formattedTotal}</strong>
            </p>
          </div>
          <div className="header-actions">
            {canEdit && (
              <button className="btn btn-success" onClick={openAdd}>
                <i className="fas fa-plus" />
                Add Sale
              </button>
            )}
          </div>
        </div>

        {/* Summary strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}>
          <div className="glass" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon green" style={{ marginBottom: 0 }}>
              <i className="fas fa-check-double" />
            </div>
            <div>
              <div className="kpi-label">Total Sales</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {total}
              </div>
            </div>
          </div>
          <div className="glass" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon green" style={{ marginBottom: 0 }}>
              <i className="fas fa-indian-rupee-sign" />
            </div>
            <div>
              <div className="kpi-label">Total Freight</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#70e6a0', lineHeight: 1.2 }}>
                {formattedTotal}
              </div>
            </div>
          </div>
          <div className="glass" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon blue" style={{ marginBottom: 0 }}>
              <i className="fas fa-calculator" />
            </div>
            <div>
              <div className="kpi-label">Avg Per Sale</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {total > 0
                  ? `₹${Math.round(totalAmount / total).toLocaleString('en-IN')}`
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="glass table-card">
          <div className="table-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="table-title">
              <i className="fas fa-receipt" />
              Sales Ledger · Query Closed Sheet
            </span>
            <div className="table-actions">
              <div className="search-wrapper">
                <i className="fas fa-search search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search name, AWB, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
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
                <p>Loading sales…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><i className="fas fa-box-open" /></div>
                <p>
                  No sales recorded yet.{' '}
                  {canEdit && (
                    <button
                      onClick={openAdd}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--blue-accent)',
                        cursor: 'pointer',
                        fontSize: 'inherit',
                        textDecoration: 'underline',
                      }}
                    >
                      Add first sale →
                    </button>
                  )}
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Query Date</th>
                    <th>Query # / Item</th>
                    <th>Customer Name</th>
                    <th>Source</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>AWB</th>
                    <th>Amount (₹)</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.query_date || '—'}</td>
                      <td
                        title={row.query_no}
                        style={{ maxWidth: 160 }}
                      >
                        {row.query_no
                          ? row.query_no.slice(0, 22) + (row.query_no.length > 22 ? '…' : '')
                          : '—'}
                      </td>
                      <td className="primary">{row.name || '—'}</td>
                      <td>{row.source || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.contact || '—'}</td>
                      <td title={row.location}>
                        {row.location
                          ? row.location.slice(0, 24) + (row.location.length > 24 ? '…' : '')
                          : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{row.awb || '—'}</td>
                      <td>
                        <strong style={{ color: '#70e6a0' }}>
                          {row.amount
                            ? `₹${Number(row.amount).toLocaleString('en-IN')}`
                            : '—'}
                        </strong>
                      </td>
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
              {totalAmount > 0 && (
                <> · Total: <strong style={{ color: '#70e6a0', marginLeft: 4 }}>{formattedTotal}</strong></>
              )}
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
          title={modal === 'edit' ? 'Edit Sale Entry' : 'Add New Sale'}
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
            <i
              className={`fas ${
                toast.type === 'success'
                  ? 'fa-circle-check'
                  : toast.type === 'error'
                  ? 'fa-circle-exclamation'
                  : 'fa-circle-info'
              }`}
              style={{
                color:
                  toast.type === 'success'
                    ? '#70e6a0'
                    : toast.type === 'error'
                    ? '#ff8080'
                    : '#4fa6ff',
                fontSize: 15,
              }}
            />
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
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
