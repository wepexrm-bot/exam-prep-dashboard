'use client';
import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, Trash2, Bell, Plus, X, Lock, Target, Clock, User, AlertTriangle, RefreshCw, Flame, Goal, Brain, ChevronDown } from 'lucide-react';
import { PageHeader, Card, CardHeader, FormGroup, showToast } from '@/components/ui';
import { NotificationPrefs } from '@/lib/types';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type TogglePref = 'revisionReminder' | 'goalsCheckIn' | 'streakReminder' | 'weeklyTarget' | 'breakReminder';
type Section = 'account' | 'study' | 'notifications' | 'danger';

const NOTIF_ICONS: Record<TogglePref, React.ReactNode> = {
  revisionReminder: <RefreshCw size={14} />,
  goalsCheckIn: <Goal size={14} />,
  streakReminder: <Flame size={14} />,
  weeklyTarget: <Target size={14} />,
  breakReminder: <Clock size={14} />,
};

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        width: 40, height: 22, borderRadius: 99, position: 'relative', cursor: 'pointer',
        transition: 'all 0.25s', flexShrink: 0,
        background: on ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${on ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: '50%', position: 'absolute', top: 2,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        background: on ? '#22D3EE' : '#5B5F68',
        boxShadow: on ? '0 0 8px rgba(34,211,238,0.5)' : 'none',
        left: on ? 21 : 2,
      }} />
    </button>
  );
}

function Select({ value, onChange, options, style: extraStyle }: { value: number; onChange: (v: number) => void; options: { value: number; label: string }[]; style?: React.CSSProperties }) {
  return (
    <select className="form-input" value={value} onChange={e => onChange(Number(e.target.value))}
      style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, width: 'auto', minWidth: 0, ...extraStyle }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Section({ id, icon, title, desc, open, onToggle, children }: { id: Section; icon: React.ReactNode; title: string; desc?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <div onClick={onToggle} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <CardHeader title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,211,238,0.1)', color: '#22D3EE', flexShrink: 0 }}>
              {icon}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)' }}>{title}</span>
            {desc && <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: 'var(--muted)' }}>{desc}</span>}
          </span>
        }>
          <ChevronDown size={15} style={{ color: 'var(--muted)', transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </CardHeader>
      </div>
      <div style={{
        maxHeight: open ? 2000 : 0, overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s',
        opacity: open ? 1 : 0,
      }}>
        <div style={{ padding: '0 4px 4px 4px' }}>
          {children}
        </div>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { data, setWeeklyTarget, clearAllGoals, updateNotificationPrefs } = useApp();
  const prefs = data.notificationPrefs || {
    revisionReminder: { enabled: true, hour: 9, minute: 0 },
    goalsCheckIn: { enabled: false, hour: 17, minute: 0 },
    streakReminder: { enabled: true, hour: 15, minute: 0 },
    weeklyTarget: { enabled: false, hour: 18, minute: 0, weekday: 0 },
    breakReminder: { enabled: false, intervalMin: 120 },
    customAlerts: [],
  };

  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({ account: false, study: false, notifications: false, danger: false });

  const toggleSection = useCallback((s: Section) => {
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));
  }, []);

  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertBody, setNewAlertBody] = useState('');
  const [newAlertHour, setNewAlertHour] = useState(12);
  const [newAlertMin, setNewAlertMin] = useState(0);

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

  const updatePref = useCallback((patch: Partial<NotificationPrefs>) => {
    updateNotificationPrefs({ ...prefs, ...patch });
  }, [prefs, updateNotificationPrefs]);

  const toggleNotif = useCallback((key: TogglePref) => {
    if (key === 'breakReminder') {
      updatePref({ breakReminder: { ...prefs.breakReminder, enabled: !prefs.breakReminder.enabled } });
    } else {
      const k = key as keyof typeof prefs;
      updatePref({ [k]: { ...(prefs as any)[k], enabled: !(prefs as any)[k].enabled } } as any);
    }
  }, [prefs, updatePref]);

  const setNotifTime = useCallback((key: TogglePref, field: 'hour' | 'minute', val: number) => {
    if (key === 'breakReminder') return;
    const k = key as keyof typeof prefs;
    updatePref({ [k]: { ...(prefs as any)[k], [field]: val } } as any);
  }, [prefs, updatePref]);

  const setWeekday = useCallback((val: number) => {
    updatePref({ weeklyTarget: { ...prefs.weeklyTarget, weekday: val } });
  }, [prefs, updatePref]);

  const setBreakInterval = useCallback((val: number) => {
    updatePref({ breakReminder: { ...prefs.breakReminder, intervalMin: val } });
  }, [prefs, updatePref]);

  const addCustomAlert = useCallback(() => {
    if (!newAlertTitle.trim()) return showToast('Enter a title for the alert');
    const maxId = Math.max(0, ...prefs.customAlerts.map(a => a.id));
    updatePref({
      customAlerts: [...prefs.customAlerts, {
        id: maxId + 1, title: newAlertTitle.trim(), body: newAlertBody.trim(),
        enabled: true, hour: newAlertHour, minute: newAlertMin, daysOfWeek: [],
      }],
    });
    setNewAlertTitle(''); setNewAlertBody('');
    showToast('Custom alert added');
  }, [prefs, newAlertTitle, newAlertBody, newAlertHour, newAlertMin, updatePref]);

  const removeCustomAlert = useCallback((id: number) => {
    updatePref({ customAlerts: prefs.customAlerts.filter(a => a.id !== id) });
  }, [prefs, updatePref]);

  const toggleCustomAlert = useCallback((id: number) => {
    updatePref({
      customAlerts: prefs.customAlerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a),
    });
  }, [prefs, updatePref]);

  const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') }));
  const MIN_OPTS = [0, 15, 30, 45].map(m => ({ value: m, label: String(m).padStart(2, '0') }));
  const INTERVAL_OPTS = [30, 60, 90, 120, 180, 240].map(m => ({ value: m, label: `Every ${m} min` }));
  const DAY_OPTS = DAYS_SHORT.map((d, i) => ({ value: i, label: d }));
  const WEEK_OPTS = [8, 10, 12, 14, 16, 20].map(h => ({ value: h, label: `${h}h` }));

  function NotifRow({ label, desc, notifKey }: { label: string; desc: string; notifKey: TogglePref }) {
    const isBreak = notifKey === 'breakReminder';
    const pref: any = (prefs as any)[notifKey];
    return (
      <div className="flex flex-wrap items-center gap-2 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: pref.enabled ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)', color: pref.enabled ? '#22D3EE' : '#5B5F68' }}>
          {NOTIF_ICONS[notifKey]}
        </div>
        <div className="flex-1 min-w-[120px]">
          <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{label}</div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{desc}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap shrink-0" style={{ marginLeft: 'auto' }}>
          {!isBreak && pref.enabled && (
            <div className="flex items-center gap-1">
              <Select value={pref.hour} onChange={v => setNotifTime(notifKey, 'hour', v)} options={HOUR_OPTS}
                style={{ padding: '3px 6px', fontSize: 10, borderRadius: 6, width: 44 }} />
              <span style={{ color: 'var(--muted)', fontSize: 10 }}>:</span>
              <Select value={pref.minute} onChange={v => setNotifTime(notifKey, 'minute', v)} options={MIN_OPTS}
                style={{ padding: '3px 6px', fontSize: 10, borderRadius: 6, width: 44 }} />
            </div>
          )}
          {isBreak && pref.enabled && (
            <Select value={pref.intervalMin} onChange={setBreakInterval} options={INTERVAL_OPTS}
              style={{ padding: '3px 8px', fontSize: 10, borderRadius: 6 }} />
          )}
          {notifKey === 'weeklyTarget' && pref.enabled && (
            <Select value={pref.weekday} onChange={setWeekday} options={DAY_OPTS}
              style={{ padding: '3px 8px', fontSize: 10, borderRadius: 6 }} />
          )}
          <Toggle on={pref.enabled} onClick={() => toggleNotif(notifKey)} />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={20} /> Settings</span>} sub="Manage your account and preferences" />

      {/* ── Account ─────────────────────────────────────────── */}
      <Section id="account" icon={<User size={14} />} title="Account" desc="Info & password" open={openSections.account} onToggle={() => toggleSection('account')}>
        <div className="rounded-xl" style={{ background: 'var(--surface2)' }}>
          {[
            ['Last data update', data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('en-IN') : '—'],
            ['Data store', 'MongoDB (cloud)'],
            ['Auth', 'JWT (7-day session)'],
          ].map(([k, v], i) => (
            <div key={k} className="flex justify-between items-center px-4 py-2.5" style={{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
              <Lock size={14} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Change password</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Stored securely with bcrypt hashing</div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 pl-11">
            <input className="form-input" type="password" placeholder="Current password" value={currPass} onChange={e => setCurrPass(e.target.value)} />
            <input className="form-input" type="password" placeholder="New password (min 6 chars)" value={newPass} onChange={e => setNewPass(e.target.value)} />
            <input className="form-input" type="password" placeholder="Confirm new password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
            {passMsg && <p style={{ fontSize: 12, color: passMsg.ok ? 'var(--success)' : 'var(--danger)' }}>{passMsg.text}</p>}
            <button className="btn btn-primary self-start" onClick={handleChangePassword}>Change password</button>
          </div>
        </div>
      </Section>

      {/* ── Study ────────────────────────────────────────────── */}
      <Section id="study" icon={<Brain size={14} />} title="Study" desc="Weekly target" open={openSections.study} onToggle={() => toggleSection('study')}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.12)', color: '#22D3EE' }}>
            <Target size={14} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Weekly study target</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Current: <strong style={{ color: '#22D3EE' }}>{data.weeklyTarget}h</strong></div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap pl-11">
          {WEEK_OPTS.map(o => (
            <button key={o.value}
              style={{
                padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${data.weeklyTarget === o.value ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: data.weeklyTarget === o.value ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
                color: data.weeklyTarget === o.value ? '#22D3EE' : 'var(--muted)',
                transition: 'all 0.15s',
              }}
              onClick={() => { setWeeklyTarget(o.value); showToast(`Weekly target set to ${o.value}h`); }}>
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Notifications ────────────────────────────────────── */}
      <Section id="notifications" icon={<Bell size={14} />} title="Notifications" desc={`${prefs.customAlerts.length > 0 ? `${prefs.customAlerts.length} custom` : 'Local push'}`} open={openSections.notifications} onToggle={() => toggleSection('notifications')}>
        <div className="rounded-xl" style={{ background: 'var(--surface2)', padding: '4px 14px' }}>
          <NotifRow notifKey="revisionReminder" label="Revision reminder" desc="Daily if revisions are due" />
          <NotifRow notifKey="goalsCheckIn" label="Goals check-in" desc="Your daily goals progress" />
          <NotifRow notifKey="streakReminder" label="Streak reminder" desc="If no activity logged today" />
          <NotifRow notifKey="weeklyTarget" label="Weekly target" desc="Progress toward your weekly goal" />
          <NotifRow notifKey="breakReminder" label="Break reminder" desc="Remind you to take breaks" />
        </div>

        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>
              <AlertTriangle size={14} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                Custom alerts {prefs.customAlerts.length > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>({prefs.customAlerts.length})</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Your own reminders at set times</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-3 pl-11">
            {prefs.customAlerts.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>No custom alerts yet — add one below.</div>
            )}
            {prefs.customAlerts.map(alert => {
              const ampm = alert.hour >= 12 ? 'PM' : 'AM';
              const hh = alert.hour % 12 || 12;
              const timeStr = `${hh}:${String(alert.minute).padStart(2, '0')} ${ampm}`;
              return (
                <div key={alert.id} className="flex items-center gap-2 py-2 px-3 rounded-lg flex-wrap" style={{ background: alert.enabled ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.02)' }}>
                  <Toggle on={alert.enabled} onClick={() => toggleCustomAlert(alert.id)} />
                  <div className="flex-1 min-w-[80px]">
                    <div className="text-[12px] font-medium truncate" style={{ color: alert.enabled ? 'var(--text)' : '#5B5F68' }}>{alert.title}</div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>
                      {timeStr}{alert.body ? ` · ${alert.body}` : ''}
                    </div>
                  </div>
                  <button onClick={() => removeCustomAlert(alert.id)}
                    className="flex items-center justify-center w-6 h-6 rounded-lg cursor-pointer shrink-0"
                    style={{ background: 'none', border: 'none', color: '#F87171', opacity: 0.6 }}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-2 pl-11">
            <div className="flex-1 min-w-[100px]">
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title</label>
              <input className="form-input" type="text" placeholder="e.g. Drink water"
                value={newAlertTitle} onChange={e => setNewAlertTitle(e.target.value)}
                style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8 }} />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Body</label>
              <input className="form-input" type="text" placeholder="e.g. Time to hydrate!"
                value={newAlertBody} onChange={e => setNewAlertBody(e.target.value)}
                style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Time</label>
              <div className="flex items-center gap-1">
                <Select value={newAlertHour} onChange={setNewAlertHour} options={HOUR_OPTS}
                  style={{ padding: '5px 6px', fontSize: 11, borderRadius: 8, width: 48 }} />
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>:</span>
                <Select value={newAlertMin} onChange={setNewAlertMin} options={MIN_OPTS}
                  style={{ padding: '5px 6px', fontSize: 11, borderRadius: 8, width: 48 }} />
              </div>
            </div>
            <button className="btn btn-sm btn-primary flex items-center gap-1" onClick={addCustomAlert}
              style={{ padding: '6px 12px', fontSize: 11 }}>
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      </Section>

      {/* ── Danger zone ──────────────────────────────────────── */}
      <Section id="danger" icon={<Trash2 size={14} />} title="Danger zone" desc="Irreversible actions" open={openSections.danger} onToggle={() => toggleSection('danger')}>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
          These actions cannot be undone. Proceed with caution.
        </p>
        <button className="btn flex items-center gap-1.5" style={{ color: '#F87171', borderColor: 'rgba(248,113,113,0.3)' }}
          onClick={() => { if (confirm('Delete ALL goals? This cannot be undone.')) { clearAllGoals(); showToast('All goals cleared'); } }}>
          <Trash2 size={14} /> Clear all goals
        </button>
      </Section>
    </>
  );
}
