'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EXAMS = [
  { id: 'GATE', label: 'GATE CS', emoji: '🖥️', color: '#2563EB', light: '#DBEAFE', tagline: 'Computer Science 2026' },
  { id: 'NET',  label: 'UGC NET', emoji: '📖', color: '#7C3AED', light: '#EDE9FE', tagline: 'English Literature 2026' },
] as const;

export default function LoginPage() {
  const [examType, setExamType] = useState<'GATE' | 'NET'>('GATE');
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateLabel, setDateLabel] = useState('');
  const router = useRouter();

  const exam = EXAMS.find(e => e.id === examType)!;

  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }));
  }, []);

  async function handleSubmit() {
    setErr('');
    if (!username.trim()) { setErr('Enter a username.'); return; }
    if (!password) { setErr('Enter a password.'); return; }
    if (isRegister && password !== confirmPass) { setErr('Passwords do not match.'); return; }
    if (isRegister && password.length < 6) { setErr('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, examType, isRegister }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'Something went wrong'); }
      else { router.push('/dashboard'); router.refresh(); }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>Exam Prep Dashboard</h1>
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Personal tracker for competitive exam aspirants</p>
      </div>

      {/* Exam selector */}
      <div className="flex gap-3 mb-6">
        {EXAMS.map(e => (
          <button key={e.id}
            onClick={() => { setExamType(e.id); setErr(''); }}
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer"
            style={{
              background: examType === e.id ? e.light : 'var(--surface)',
              borderColor: examType === e.id ? e.color : 'var(--border)',
              fontFamily: 'DM Sans, sans-serif',
            }}>
            <span className="text-3xl">{e.emoji}</span>
            <span className="font-bold text-[15px]" style={{ color: examType === e.id ? e.color : 'var(--text)' }}>{e.label}</span>
            <span className="text-[11px]" style={{ color: examType === e.id ? e.color : 'var(--muted)' }}>{e.tagline}</span>
          </button>
        ))}
      </div>

      {/* Login/Register card */}
      <div className="w-[380px] max-w-[95vw] rounded-2xl border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.10)]"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        {/* Card header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: exam.color, color: '#fff' }}>{exam.emoji}</div>
          <div>
            <div className="text-[17px] font-bold" style={{ color: 'var(--text)' }}>{exam.label}</div>
            <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{isRegister ? 'Create account' : 'Sign in to your dashboard'}</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full my-4"
          style={{ background: exam.light, color: exam.color }}>
          📅 {dateLabel}
        </div>

        {/* Form */}
        <div className="flex flex-col gap-2.5">
          <input className="form-input" type="text" placeholder="Username"
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          <input className="form-input" type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          {isRegister && (
            <input className="form-input" type="password" placeholder="Confirm password"
              value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          )}
          {err && <p className="text-xs text-danger">{err}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-btn font-semibold text-[15px] transition-opacity disabled:opacity-60 mt-1"
            style={{ background: exam.color, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {loading ? (isRegister ? 'Creating account…' : 'Signing in…') : (isRegister ? 'Create account →' : 'Sign in →')}
          </button>
        </div>

        {/* Toggle register/login */}
        <p className="text-center text-[12px] mt-4" style={{ color: 'var(--muted)' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setIsRegister(!isRegister); setErr(''); setConfirmPass(''); }}
            className="font-semibold underline"
            style={{ background: 'none', border: 'none', color: exam.color, cursor: 'pointer', fontFamily: 'inherit' }}>
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </p>
      </div>

      <p className="text-[11px] mt-6 text-center" style={{ color: 'var(--muted)' }}>
        Each user has their own private dashboard · Data stored in MongoDB
      </p>
    </div>
  );
}
