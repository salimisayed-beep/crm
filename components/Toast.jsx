'use client';

import { useEffect } from 'react';

export function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons = {
    success: 'fas fa-circle-check',
    error: 'fas fa-circle-exclamation',
    info: 'fas fa-circle-info',
  };

  const colors = {
    success: '#70e6a0',
    error: '#ff8080',
    info: '#4fa6ff',
  };

  const type = toast.type || 'info';

  return (
    <div className={`toast ${type}`}>
      <i
        className={icons[type]}
        style={{ color: colors[type], fontSize: 15, flexShrink: 0 }}
      />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 12,
          padding: 0,
          marginLeft: 8,
          flexShrink: 0,
        }}
      >
        <i className="fas fa-xmark" />
      </button>
    </div>
  );
}

// Custom hook for toast management
export function useToast() {
  const [toasts, setToasts] = require('react').useState([]);

  function addToast(message, type = 'info', duration = 3500) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, addToast, removeToast };
}
