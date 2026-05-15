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
    if (score >= 80) return '🔥 Excellent';
    if (score >= 65) return '✅ Good';
    if (score >= 50) return '⚠ Average';
    return '❌ Needs work';
  }

  return (
    <>
      <PageHeader title="Score Log" sub="Daily performance history">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Log today ↗</button>
      </PageHeader>

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

      <Card>
        <CardHeader title={`All entries (${scores.length})`} />
        {scores.length === 0 && <Empty>No scores logged yet.</Empty>}
        {scores.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Date', 'Score', 'Accuracy', 'Study hours', 'Rating', ''].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scores.map(s => {
                  const barBg = s.score >= 70 ? '#16A34A' : s.score >= 50 ? '#D97706' : '#DC2626';
                  return (
                    <tr key={s.date} className="border-b hover:bg-[var(--surface2)] transition-colors group" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2.5 pr-4" style={{ color: 'var(--muted)' }}>{s.date}</td>
                      <td className="py-2.5 pr-4">
                        <strong style={{ color: 'var(--text)' }}>{s.score}%</strong>
                        <div className="h-1 rounded-full mt-1" style={{ width: `${Math.min(100, s.score)}%`, maxWidth: 100, background: barBg }} />
                      </td>
                      <td className="py-2.5 pr-4" style={{ color: 'var(--text)' }}>{s.accuracy}%</td>
                      <td className="py-2.5 pr-4" style={{ color: 'var(--text)' }}>{s.hours}h</td>
                      <td className="py-2.5 pr-4" style={{ color: 'var(--text)' }}>{rating(s.score)}</td>
                      <td className="py-2.5">
                        <button
                          onClick={() => { if (confirm(`Delete score for ${s.date}?`)) { deleteScore(s.date); showToast('Score deleted'); } }}
                          className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 rounded border transition-all"
                          style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ScoreModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
