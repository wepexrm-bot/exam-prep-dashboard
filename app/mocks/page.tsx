'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, MetricCard, Empty, showToast } from '@/components/ui';
import { MockModal } from '@/components/modals/ScoreModal';

export default function MocksPage() {
  const { data, deleteMock } = useApp();
  const [showModal, setShowModal] = useState(false);

  const mocks = [...(data.mockTests || [])].reverse();
  const rawMocks = data.mockTests || [];
  const best = rawMocks.length ? Math.max(...rawMocks.map(m => Math.round(m.score / m.total * 100))) : 0;
  const avg = rawMocks.length ? Math.round(rawMocks.reduce((a, m) => a + m.score / m.total * 100, 0) / rawMocks.length) : 0;
  const above60 = rawMocks.filter(m => m.score / m.total >= 0.6).length;

  return (
    <>
      <PageHeader title="Mock Tests" sub="Track your practice test performance">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add test</button>
      </PageHeader>

      {rawMocks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
          <MetricCard label="Tests taken" value={rawMocks.length} />
          <MetricCard label="Best score" value={<span style={{ color: 'var(--success)' }}>{best}<sup className="text-sm font-normal">%</sup></span>} />
          <MetricCard label="Avg score" value={<>{avg}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} />
          <MetricCard label="Above 60%" value={<span style={{ color: '#2563EB' }}>{above60}</span>} />
        </div>
      )}

      <Card>
        <CardHeader title={`All mock tests (${mocks.length})`} />
        {mocks.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📝</div>
            <div className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text)' }}>No mock tests logged yet</div>
            <div className="text-[13px] mb-5" style={{ color: 'var(--muted)' }}>Add your first mock test result</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add test</button>
          </div>
        )}
        {mocks.map((m, i) => {
          const pct = Math.round(m.score / m.total * 100);
          const col = pct >= 70 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
          const origIdx = rawMocks.length - 1 - i;
          return (
            <div key={i} className="flex items-center gap-3 py-3 border-b last:border-0 group flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{m.date}</span>
              <span className="flex-1 font-semibold text-[13px] px-2" style={{ color: 'var(--text)' }}>{m.subject}</span>
              <div>
                <strong style={{ color: col }}>{m.score}/{m.total}</strong>
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}> ({pct}%)</span>
                <div className="h-1 rounded-full mt-1" style={{ width: `${pct}%`, maxWidth: 120, background: col }} />
              </div>
              <button
                onClick={() => { if (confirm('Delete this mock test?')) { deleteMock(origIdx); showToast('Mock test deleted'); } }}
                className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 rounded border ml-2 transition-all"
                style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>
          );
        })}
      </Card>

      <MockModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
