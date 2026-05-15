'use client';
import { useEffect, useRef, ReactNode } from 'react';
import { clsx } from 'clsx';

// ── Modal ────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-[2px]"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="rounded-card border p-6 w-[380px] max-w-[95vw] shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ── Modal Actions ────────────────────────────────────────────

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 justify-end mt-5">{children}</div>;
}

// ── Form Group ───────────────────────────────────────────────

export function FormGroup({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
        {label}
        {hint && <span className="ml-2 normal-case font-normal text-[10px]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

// ── Metric Card ──────────────────────────────────────────────

interface MetricProps {
  label: string;
  value: ReactNode;
  sub?: string;
  subColor?: 'up' | 'down' | 'muted';
}

export function MetricCard({ label, value, sub, subColor = 'muted' }: MetricProps) {
  const subClass = subColor === 'up' ? 'text-success' : subColor === 'down' ? 'text-danger' : '';
  return (
    <div className="metric">
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-[26px] font-bold leading-none" style={{ color: 'var(--text)' }}>{value}</div>
      {sub && <div className={clsx('text-[11px] mt-1.5', subClass)} style={!subClass ? { color: 'var(--muted)' } : {}}>{sub}</div>}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────

export function ProgressBar({ pct, color = '#2563EB' }: { pct: number; color?: string }) {
  return (
    <div className="progress-bar flex-1">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="text-[13px] text-center py-6" style={{ color: 'var(--muted)' }}>{children}</div>
  );
}

// ── Page Header ──────────────────────────────────────────────

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex justify-between items-start mb-6 flex-wrap gap-2.5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{title}</h1>
        {sub && <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
      {children && <div className="flex gap-2 flex-wrap items-center">{children}</div>}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card', className)}>{children}</div>;
}

export function CardHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex justify-between items-center mb-3.5">
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{title}</span>
      {children}
    </div>
  );
}

// ── Meter ─────────────────────────────────────────────────────

export function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="meter">
      <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Toast (imperative) ───────────────────────────────────────

let toastTimeout: ReturnType<typeof setTimeout>;
export function showToast(msg: string) {
  const el = document.getElementById('__toast__');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
  }, 2500);
}

export function ToastContainer() {
  return (
    <div id="__toast__"
      className="fixed bottom-6 right-6 px-4 py-2.5 rounded-btn text-sm z-[300] font-medium pointer-events-none transition-all duration-250"
      style={{ background: 'var(--text)', color: 'var(--bg)', opacity: 0, transform: 'translateY(6px)' }}
    />
  );
}
