'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight, RefreshCw, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'reset' && codeRef.current) codeRef.current.focus();
  }, [step]);

  async function handleSendCode() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send code');
        setLoading(false);
        return;
      }
      setStep('reset');
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
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

  async function handleReset() {
    setError('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed');
        setLoading(false);
        return;
      }
      router.push('/login');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
      }}><GraduationCap size={28} style={{ color: '#0F172A' }} /></div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Forgot password</h1>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 24 }}>
        {step === 'email' ? 'Enter your email to receive a reset code' : `Reset code sent to ${email}`}
      </p>

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, backdropFilter: 'blur(20px)',
        padding: 28,
      }}>
        {step === 'email' && (
          <>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              placeholder="you@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendCode()}
              autoFocus
            />

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                color: '#F87171', fontSize: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 10,
              }}>{error}</div>
            )}

            <button
              onClick={handleSendCode}
              disabled={loading || !isEmailValid}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg, #22D3EE, #3B82F6)', color: '#0F172A',
                border: 'none', cursor: 'pointer', marginTop: 4,
                boxShadow: '0 0 20px rgba(34,211,238,0.3)',
                opacity: loading || !isEmailValid ? 0.6 : 1,
              }}
            >{loading ? 'Sending...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Send reset code <ArrowRight size={16} /></span>}</button>
          </>
        )}

        {step === 'reset' && (
          <>
            <label style={labelStyle}>Reset code</label>
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 24,
                textAlign: 'center', letterSpacing: 8, fontWeight: 700,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none', marginBottom: 16,
              }}
            />

            <label style={labelStyle}>New password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: 44 }}
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: 8,
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >{showPassword
                ? <EyeOff size={18} strokeWidth={1.5} />
                : <Eye size={18} strokeWidth={1.5} />
              }</button>
            </div>

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
              }}>A new code has been sent.</div>
            )}

            <button
              onClick={handleReset}
              disabled={loading || code.length !== 6 || newPassword.length < 8}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg, #22D3EE, #3B82F6)', color: '#0F172A',
                border: 'none', cursor: 'pointer', marginTop: 4,
                boxShadow: '0 0 20px rgba(34,211,238,0.3)',
                opacity: loading || code.length !== 6 || newPassword.length < 8 ? 0.6 : 1,
              }}
            >{loading ? 'Resetting...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Reset password <ArrowRight size={16} /></span>}</button>

            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'none', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', marginTop: 12,
              }}
            >{resending ? 'Sending...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><RefreshCw size={14} /> Resend code</span>}</button>

            <button
              onClick={() => setStep('email')}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'none', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', marginTop: 8,
              }}
            ><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ArrowLeft size={14} /> Change email</span></button>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#64748B', marginTop: 20 }}>
        <a href="/login" style={{ color: '#22D3EE', textDecoration: 'none' }}>Back to login</a>
      </p>
      <p style={{ fontSize: 9, color: '#5B5F68', marginTop: 24 }}>
        &copy; {new Date().getFullYear()} wepex. All rights reserved.
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8',
  marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 15,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', outline: 'none', marginBottom: 16,
};