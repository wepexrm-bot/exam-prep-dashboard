'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsVerification) {
          router.push(`/verify?email=${encodeURIComponent(data.email)}`);
          return;
        }
        setError(data.error || 'Login failed');
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

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Welcome back</h1>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 24 }}>Log in to continue your prep</p>

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, backdropFilter: 'blur(20px)',
        padding: 28,
      }}>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          style={inputStyle}
          placeholder="you@gmail.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label style={labelStyle}>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            style={{ ...inputStyle, paddingRight: 44 }}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
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
            color: '#F87171', fontSize: 12, padding: '10px 12px', borderRadius: 10, marginTop: 10,
          }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: 'linear-gradient(135deg, #22D3EE, #3B82F6)', color: '#0F172A',
            border: 'none', cursor: 'pointer', marginTop: 16,
            boxShadow: '0 0 20px rgba(34,211,238,0.3)',
            opacity: loading ? 0.6 : 1,
          }}
        >{loading ? 'Logging in...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Log in <ArrowRight size={16} /></span>}</button>
      </div>

      <p style={{ fontSize: 12, color: '#64748B', marginTop: 20 }}>
        Don't have an account?{' '}
        <a href="/signup" style={{ color: '#22D3EE', textDecoration: 'none' }}>Sign up</a>
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
