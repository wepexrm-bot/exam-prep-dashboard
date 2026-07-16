'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Mail, ArrowRight, RefreshCw } from 'lucide-react';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  async function handleVerify() {
    setError('');
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setLoading(true);
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
      sessionStorage.setItem('freshLogin', '1');
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to resend code');
        setResending(false);
        return;
      }
      setResent(true);
    } catch {
      setError('Network error. Please try again.');
    }
    setResending(false);
  }

  if (!email) return null;

  return (
    <div style={{
      width: '100%', maxWidth: 360,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20, backdropFilter: 'blur(20px)',
      padding: 28,
    }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>Verification code</label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        placeholder="000000"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={e => e.key === 'Enter' && handleVerify()}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 24,
          textAlign: 'center', letterSpacing: 8, fontWeight: 700,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', outline: 'none', marginBottom: 16,
        }}
      />

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          color: '#F87171', fontSize: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 10,
        }}>{error}</div>
      )}

      {resent && (
        <div style={{
          background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
          color: '#4ADE80', fontSize: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 10,
        }}>A new code has been sent to your email.</div>
      )}

      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          background: 'linear-gradient(135deg, #22D3EE, #3B82F6)', color: '#0F172A',
          border: 'none', cursor: 'pointer', marginTop: 4,
          boxShadow: '0 0 20px rgba(34,211,238,0.3)',
          opacity: loading || code.length !== 6 ? 0.6 : 1,
        }}
      >{loading ? 'Verifying...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Verify <ArrowRight size={16} /></span>}</button>

      <button
        onClick={handleResend}
        disabled={resending}
        style={{
          width: '100%', padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: 'none', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer', marginTop: 12,
        }}
      >{resending ? 'Sending...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><RefreshCw size={14} /> Resend code</span>}</button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 60%, #000000 100%)',
      color: '#E2E8F0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, marginBottom: 16,
        background: 'linear-gradient(135deg, #22D3EE, #3B82F6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 24px rgba(34,211,238,0.4)',
      }}><Mail size={28} style={{ color: '#0F172A' }} /></div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Verify your email</h1>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 24, textAlign: 'center' }}>
        We sent a 6-digit code to your email. Enter it below to continue.
      </p>

      <Suspense fallback={null}>
        <VerifyForm />
      </Suspense>

      <p style={{ fontSize: 12, color: '#64748B', marginTop: 20 }}>
        <a href="/login" style={{ color: '#22D3EE', textDecoration: 'none' }}>Back to login</a>
      </p>
      <p style={{ fontSize: 9, color: '#5B5F68', marginTop: 24 }}>
        &copy; {new Date().getFullYear()} wepex. All rights reserved.
      </p>
    </div>
  );
}
