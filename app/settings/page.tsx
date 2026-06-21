'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, Trash2 } from 'lucide-react';
import { PageHeader, Card, CardHeader, FormGroup, showToast } from '@/components/ui';

export default function SettingsPage() {
  const { data, setWeeklyTarget, clearAllGoals } = useApp();
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleChangePassword() {
    setPassMsg(null);
    if (newPass.length < 6) { setPassMsg({ text: '✕ New password must be at least 6 characters', ok: false }); return; }
    if (newPass !== confirmPass) { setPassMsg({ text: '✕ Passwords do not match', ok: false }); return; }
    try {
      const r = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currPass, newPassword: newPass }),
      });
      const d = await r.json();
      if (!r.ok) { setPassMsg({ text: `✕ ${d.error}`, ok: false }); return; }
      setPassMsg({ text: '✓ Password changed successfully', ok: true });
      setCurrPass(''); setNewPass(''); setConfirmPass('');
      showToast('Password changed');
    } catch {
      setPassMsg({ text: '✕ Network error', ok: false });
    }
  }

  return (
    <>
      <PageHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={20} /> Settings</span>} sub="Manage your account and preferences" />

      {/* Change password */}
      <Card className="mb-4">
        <CardHeader title="Change password" />
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Your password is stored securely with bcrypt hashing. After changing, you'll need to use the new password to sign in.
        </p>
        <div className="max-w-[360px] flex flex-col gap-3">
          <FormGroup label="Current password">
            <input className="form-input" type="password" placeholder="Enter current password" value={currPass} onChange={e => setCurrPass(e.target.value)} />
          </FormGroup>
          <FormGroup label="New password">
            <input className="form-input" type="password" placeholder="Enter new password" value={newPass} onChange={e => setNewPass(e.target.value)} />
          </FormGroup>
          <FormGroup label="Confirm new password">
            <input className="form-input" type="password" placeholder="Confirm new password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
          </FormGroup>
          {passMsg && <p className="text-[12px]" style={{ color: passMsg.ok ? 'var(--success)' : 'var(--danger)' }}>{passMsg.text}</p>}
          <button className="btn btn-primary self-start" onClick={handleChangePassword}>Change password</button>
        </div>
      </Card>

      {/* Weekly target */}
      <Card className="mb-4">
        <CardHeader title="Weekly study target" />
        <p className="text-[13px] mb-3" style={{ color: 'var(--muted)' }}>Current target: <strong style={{ color: 'var(--text)' }}>{data.weeklyTarget} hours/week</strong></p>
        <div className="flex gap-2 flex-wrap">
          {[8, 10, 12, 14, 16, 20].map(h => (
            <button key={h}
              className={`btn btn-sm ${data.weeklyTarget === h ? 'btn-primary' : ''}`}
              onClick={() => { setWeeklyTarget(h); showToast(`Weekly target set to ${h}h`); }}>
              {h}h
            </button>
          ))}
        </div>
      </Card>

      {/* Account info */}
      <Card className="mb-4">
        <CardHeader title="Account info" />
        <div className="text-[13px] flex flex-col gap-2">
          {[
            ['Last data update', data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('en-IN') : '—'],
            ['Data store', 'MongoDB (cloud)'],
            ['Auth', 'JWT (7-day session)'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span>
              <strong style={{ color: 'var(--text)' }}>{v}</strong>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-l-4 border-danger">
        <CardHeader title="Danger zone" />
        <p className="text-[13px] mb-3" style={{ color: 'var(--muted)' }}>These actions are irreversible. Be careful.</p>
          <button className="btn flex items-center gap-1.5" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          onClick={() => { if (confirm('Delete ALL goals? This cannot be undone.')) { clearAllGoals(); showToast('All goals cleared'); } }}>
          <Trash2 size={14} /> Clear all goals
        </button>
      </Card>
    </>
  );
}
