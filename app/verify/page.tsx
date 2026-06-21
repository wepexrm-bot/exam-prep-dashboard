'use client';
import { Mail, Check } from 'lucide-react';
import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true); setError('');
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend code');
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 4000);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setResending(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 60%, #000000 100%)',
      color: '#E2E8F0',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '60px 20px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, marginBottom: 16,
        background: 'linear-gradient(135deg, #22D3EE, #3B82F6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 24px rgba(34,211,238,0.4)',
      }}><Mail size={28} style={{ color: '#0F172A' }} /></div>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>
        Check your inbox
      </h1>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center', maxWidth: 280 }}>
        We sent a 6-digit code to <strong style={{ color: '#CBD5E1' }}>{email}</strong>
      </p>

      <div style={{
        display: 'flex', gap: 8, marginTop: 28, marginBottom: 20,
      }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputsRef.current[i] = el; }}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            maxLength={1}
            inputMode="numeric"
            style={{
              width: 44, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
              borderRadius: 12, background: 'rgba(255,255,255,0.05)',
              border: d ? '1.5px solid #22D3EE' : '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none',
              boxShadow: d ? '0 0 12px rgba(34,211,238,0.3)' : 'none',
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          color: '#F87171', fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          maxWidth: 300, textAlign: 'center',
        }}>{error}</div>
      )}

      <button
        onClick={handleVerify}
        disabled={loading}
        style={{
          width: '100%', maxWidth: 300, padding: '14px', borderRadius: 12,
          fontSize: 14, fontWeight: 700,
          background: 'linear-gradient(135deg, #22D3EE, #3B82F6)', color: '#0F172A',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(34,211,238,0.3)',
          opacity: loading ? 0.6 : 1,
        }}
      >{loading ? 'Verifying...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Verify account <Check size={14} /></span>}</button>

      <button
        onClick={handleResend}
        disabled={resending}
        style={{
          marginTop: 16, background: 'none', border: 'none',
          color: resent ? '#4ADE80' : '#64748B', fontSize: 12, cursor: 'pointer',
        }}
        >{resent ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Code resent!</span> : resending ? 'Sending...' : "Didn't get a code? Resend"}</button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
