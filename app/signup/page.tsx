'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Styles for select dropdown options
const selectOptionStyles = `
  select option {
    background-color: #1a2332;
    color: #ffffff;
    padding: 8px;
  }
  select option:hover {
    background-color: #2a3f52;
  }
  select option:checked {
    background: linear-gradient(#22D3EE, #22D3EE);
    background-color: #22D3EE;
    color: #0f172a;
  }
`;

const EXAM_OPTIONS = [
  { value: 'GATE', label: 'GATE CS', emoji: '🖥️', color: '#22D3EE' },
  { value: 'NET', label: 'UGC NET', emoji: '📖', color: '#A78BFA' },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [examType, setExamType] = useState<'GATE' | 'NET' | ''>('');
  const [examYear, setExamYear] = useState(new Date().getFullYear() + 1);
  const [password, setPassword] = useState('');

  function next() { setError(''); setStep(s => s + 1); }
  function back() { setError(''); setStep(s => s - 1); }

  async function handleSubmit() {
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, examType, examYear }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <style>{selectOptionStyles}</style>
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 60%, #000000 100%)',
        color: '#E2E8F0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 20px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
      {/* Logo / header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #22D3EE, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          boxShadow: '0 0 24px rgba(34,211,238,0.4)',
        }}>🎓</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Create your account</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Step {step} of 4</p>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{
            width: n === step ? 24 : 8, height: 8, borderRadius: 99,
            background: n <= step ? '#22D3EE' : 'rgba(255,255,255,0.1)',
            boxShadow: n <= step ? '0 0 8px rgba(34,211,238,0.6)' : 'none',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, backdropFilter: 'blur(20px)',
        padding: 28,
      }}>
        {/* Step 1: Name */}
        {step === 1 && (
          <>
            <label style={labelStyle}>What's your name?</label>
            <input
              autoFocus
              style={inputStyle}
              placeholder="e.g. Donald Trump"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && next()}
            />
            <button
              disabled={!name.trim()}
              onClick={next}
              style={{ ...btnPrimary, opacity: name.trim() ? 1 : 0.4 }}
            >Continue →</button>
          </>
        )}

        {/* Step 2: Email */}
        {step === 2 && (
          <>
            <label style={labelStyle}>What's your email?</label>
            <input
              autoFocus
              type="email"
              style={inputStyle}
              placeholder="you@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email.includes('@') && next()}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={back} style={btnSecondary}>← Back</button>
              <button
                disabled={!email.includes('@')}
                onClick={next}
                style={{ ...btnPrimary, opacity: email.includes('@') ? 1 : 0.4 }}
              >Continue →</button>
            </div>
          </>
        )}

        {/* Step 3: Exam type + year */}
        {step === 3 && (
          <>
            <label style={labelStyle}>Which exam are you preparing for?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {EXAM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setExamType(opt.value as 'GATE' | 'NET')}
                  style={{
                    padding: '16px 12px', borderRadius: 14, cursor: 'pointer',
                    background: examType === opt.value ? `${opt.color}1A` : 'rgba(255,255,255,0.03)',
                    border: examType === opt.value ? `1.5px solid ${opt.color}` : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: examType === opt.value ? `0 0 16px ${opt.color}33` : 'none',
                    color: examType === opt.value ? opt.color : '#94A3B8',
                    fontWeight: 700, fontSize: 13, textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.emoji}</div>
                  {opt.label}
                </button>
              ))}
            </div>

            <label style={labelStyle}>Target exam year</label>
            <select
              style={selectStyle}
              value={examYear}
              onChange={e => setExamYear(Number(e.target.value))}
            >
              {[0, 1, 2, 3].map(offset => {
                const y = new Date().getFullYear() + offset;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={back} style={btnSecondary}>← Back</button>
              <button
                disabled={!examType}
                onClick={next}
                style={{ ...btnPrimary, opacity: examType ? 1 : 0.4 }}
              >Continue →</button>
            </div>
          </>
        )}

        {/* Step 4: Password */}
        {step === 4 && (
          <>
            <label style={labelStyle}>Create a password</label>
            <input
              autoFocus
              type="password"
              style={inputStyle}
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                color: '#F87171', fontSize: 12, padding: '10px 12px', borderRadius: 10, marginTop: 10,
              }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={back} style={btnSecondary}>← Back</button>
              <button
                disabled={loading || password.length < 6}
                onClick={handleSubmit}
                style={{ ...btnPrimary, opacity: loading || password.length < 6 ? 0.5 : 1 }}
              >{loading ? 'Creating account...' : 'Create account ✓'}</button>
            </div>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#64748B', marginTop: 20 }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#22D3EE', textDecoration: 'none' }}>Log in</a>
      </p>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8',
  marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 15,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', outline: 'none', marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  colorScheme: 'dark',
  backgroundColor: 'rgba(255,255,255,0.08)',
  cursor: 'pointer',
  appearance: 'none',
  paddingRight: '36px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
  background: 'linear-gradient(135deg, #22D3EE, #3B82F6)', color: '#0F172A',
  border: 'none', cursor: 'pointer', marginTop: 16,
  boxShadow: '0 0 20px rgba(34,211,238,0.3)',
};

const btnSecondary: React.CSSProperties = {
  flex: '0 0 90px', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 600,
  background: 'rgba(255,255,255,0.05)', color: '#94A3B8',
  border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
};
