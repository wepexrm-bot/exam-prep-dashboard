'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, Empty, showToast } from '@/components/ui';
import { ScoreModal } from '@/components/modals/ScoreModal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ScoresPage() {
  const { data, deleteScore } = useApp();
  const [showModal, setShowModal] = useState(false);

  const scores = [...(data.dailyScores || [])].reverse();
  const sorted = [...(data.dailyScores || [])];
  const chartData = sorted.map(s => ({ date: s.date.slice(5), score: s.score, acc: s.accuracy }));

  function rating(score: number) {
    if (score >= 80) return { label: '🔥 Excellent', color: '#16A34A' };
    if (score >= 65) return { label: '✅ Good', color: '#2563EB' };
    if (score >= 50) return { label: '⚠ Average', color: '#D97706' };
    return { label: '❌ Needs work', color: '#DC2626' };
  }

  return (
    <>
      <PageHeader title="Score Log" sub="Daily performance history">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Log today ↗</button>
      </PageHeader>

      {/* Chart */}
      <Card className="mb-4">
        <CardHeader title="Score history (last 30 days)" />
        {chartData.length === 0 ? (
          <Empty>No scores yet. Hit "Log today" to start!</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData.slice(-30)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} name="Score %" />
              <Line type="monotone" dataKey="acc" stroke="#7C3AED" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Accuracy %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Desktop table — hidden on mobile */}
      <Card className="hidden md:block">
        <CardHeader title={`All entries (${scores.length})`} />
        {scores.length === 0 && <Empty>No scores logged yet.</Empty>}
        {scores.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Score', 'Accuracy', 'Study hours', 'Rating', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 16px 8px 0',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.05em', color: 'var(--muted)'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scores.map(s => {
                  const barBg = s.score >= 70 ? '#16A34A' : s.score >= 50 ? '#D97706' : '#DC2626';
                  const r = rating(s.score);
                  return (
                    <tr key={s.date} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 16px 10px 0', color: 'var(--muted)' }}>{s.date}</td>
                      <td style={{ padding: '10px 16px 10px 0' }}>
                        <strong style={{ color: 'var(--text)' }}>{s.score > 0 ? `${s.score}%` : '—'}</strong>
                        {s.score > 0 && <div style={{ height: 4, borderRadius: 99, marginTop: 4, width: `${Math.min(100, s.score)}%`, maxWidth: 80, background: barBg }} />}
                      </td>
                      <td style={{ padding: '10px 16px 10px 0', color: 'var(--text)' }}>{s.accuracy > 0 ? `${s.accuracy}%` : '—'}</td>
                      <td style={{ padding: '10px 16px 10px 0', color: 'var(--text)' }}>{s.hours > 0 ? `${s.hours}h` : '—'}</td>
                      <td style={{ padding: '10px 16px 10px 0', color: r.color, fontSize: 12 }}>{s.score > 0 ? r.label : '—'}</td>
                      <td style={{ padding: '10px 0' }}>
                        <button
                          onClick={() => { if (confirm(`Delete entry for ${s.date}?`)) { deleteScore(s.date); showToast('Entry deleted'); } }}
                          style={{
                            background: 'none', border: '1px solid var(--border)',
                            color: 'var(--muted)', cursor: 'pointer', fontSize: 11,
                            padding: '2px 8px', borderRadius: 4, fontFamily: 'inherit'
                          }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mobile cards — shown only on mobile */}
      <div className="md:hidden">
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8
        }}>All entries ({scores.length})</div>
        {scores.length === 0 && (
          <Card><Empty>No scores logged yet.</Empty></Card>
        )}
        {scores.map(s => {
          const r = rating(s.score);
          const barBg = s.score >= 70 ? '#16A34A' : s.score >= 50 ? '#D97706' : '#DC2626';
          return (
            <div key={s.date} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 8
            }}>
              {/* Date + delete */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{s.date}</span>
                <button
                  onClick={() => { if (confirm(`Delete entry for ${s.date}?`)) { deleteScore(s.date); showToast('Entry deleted'); } }}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    color: 'var(--muted)', cursor: 'pointer', fontSize: 11,
                    padding: '2px 8px', borderRadius: 4, fontFamily: 'inherit'
                  }}>✕</button>
              </div>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>SCORE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                    {s.score > 0 ? `${s.score}%` : '—'}
                  </div>
                  {s.score > 0 && (
                    <div style={{ height: 3, borderRadius: 99, marginTop: 4, width: `${s.score}%`, background: barBg }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>ACCURACY</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                    {s.accuracy > 0 ? `${s.accuracy}%` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>HOURS</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                    {s.hours > 0 ? `${s.hours}h` : '—'}
                  </div>
                </div>
              </div>
              {s.score > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: r.color }}>{r.label}</div>
              )}
            </div>
          );
        })}
      </div>

      <ScoreModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}