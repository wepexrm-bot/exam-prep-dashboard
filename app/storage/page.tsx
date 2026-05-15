'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, showToast } from '@/components/ui';

interface Stats { scores: number; sessions: number; mockTests: number; pyqEntries: number; revisions: number; fileSizeKB: number; }

export default function StoragePage() {
  const { data, loadData, syncToServer } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  async function handleExport() {
    const a = document.createElement('a');
    a.href = '/api/export';
    a.download = `gate-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Backup downloaded ✓');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!confirm('This will overwrite your current data. Continue?')) return;
      await syncToServer(parsed);
      await loadData();
      showToast('Data restored from backup ✓');
    } catch {
      showToast('Invalid backup file');
    }
  }

  async function handleSync() {
    showToast('Syncing…');
    await loadData();
    const res = await fetch('/api/stats').then(r => r.json());
    setStats(res);
    showToast('Synced ✓');
  }

  return (
    <>
      <PageHeader title="Data & Backup" sub="Manage your data and export backups" />

      {/* Stats */}
      <Card className="mb-4">
        <CardHeader title="Storage summary" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats ? [
            ['Daily scores', stats.scores],
            ['Study sessions', stats.sessions],
            ['Mock tests', stats.mockTests],
            ['PYQ entries', stats.pyqEntries],
            ['Revisions', stats.revisions],
            ['Data size', `${stats.fileSizeKB} KB`],
          ].map(([k, v]) => (
            <div key={k} className="px-4 py-3 rounded-btn" style={{ background: 'var(--surface2)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{k}</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{v}</div>
            </div>
          )) : (
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Loading stats…</div>
          )}
        </div>
      </Card>

      {/* Backup */}
      <Card className="mb-4">
        <CardHeader title="Backup & Restore" />
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
          Download a full JSON backup of your data. Keep this safe — you can restore it if needed.
        </p>
        <div className="flex gap-2.5 flex-wrap">
          <button className="btn btn-primary" onClick={handleExport}>⬇ Download backup</button>
          <label className="btn cursor-pointer">
            ⬆ Restore from backup
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button className="btn" style={{ color: '#2563EB' }} onClick={handleSync}>🔄 Force sync</button>
        </div>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader title="About your data" />
        <div className="text-[13px] flex flex-col gap-2" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
          <p>Your data is stored in <strong style={{ color: 'var(--text)' }}>MongoDB</strong> on the server and synced automatically on every change.</p>
          <p>Last updated: <strong style={{ color: 'var(--text)' }}>{data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('en-IN') : '—'}</strong></p>
          <p>The backup file is a plain JSON export — you can open it in any text editor.</p>
        </div>
      </Card>
    </>
  );
}
