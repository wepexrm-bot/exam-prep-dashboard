'use client';
import { useApp } from '@/context/AppContext';
import { BarChart3, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { PageHeader, Card, CardHeader, MetricCard, Meter, Empty } from '@/components/ui';
import { getPrediction, getPct } from '@/lib/utils';
import { useExamConfig } from '@/lib/useExamConfig';

export default function PredictPage() {
  const { data, examType } = useApp();
  const { config: cfg } = useExamConfig(examType);
  const pred = getPrediction(data, cfg.weights);
  const scores = data.dailyScores || [];
  const mocks = data.mockTests || [];
  const recent = scores.slice(-7);
  const improving = recent.length >= 2 && recent[recent.length - 1].score > recent[0].score;
  const avgMock = mocks.length ? Math.round(mocks.reduce((a, m) => a + m.score / m.total * 100, 0) / mocks.length) : null;
  const avgSubPct = (data.subjects || []).length
    ? Math.round((data.subjects || []).reduce((a, s) => a + getPct(s), 0) / (data.subjects || []).length)
    : 0;

  return (
    <>
      <PageHeader title="Exam Prediction" sub={`Estimated performance for ${cfg.label} · ${cfg.tagline}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <MetricCard label="Predicted score"
          value={pred.noData ? '—' : <span style={{ color: cfg.color }}>{pred.score}<sup className="text-sm font-normal">/100</sup></span>}
          sub={pred.noData ? 'No data yet' : 'Based on last 14 sessions'} />
        <MetricCard label="Expected percentile"
          value={pred.noData ? '—' : <>{pred.percentile}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>}
          sub={pred.noData ? 'No data yet' : '▲ AIR estimate'} />
        <MetricCard label="Qualifying chance"
          value={pred.noData ? '—' : <span style={{ color: !pred.noData && pred.qualify! >= 60 ? 'var(--success)' : '#D97706' }}>{pred.qualify}<sup className="text-sm font-normal">%</sup></span>}
          sub={pred.noData ? 'No data yet' : pred.qualify! >= 60 ? 'Looking good!' : 'Keep practicing'}
          subColor={pred.noData ? 'muted' : pred.qualify! >= 60 ? 'up' : 'muted'} />
        <MetricCard label="Subject avg" value={<>{avgSubPct}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} sub="Across all subjects" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Card>
          <CardHeader title="Score projection" />
          {pred.noData ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-3"><BarChart3 size={40} strokeWidth={1.5} style={{ color: 'var(--muted)' }} /></div>
              <div className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text)' }}>No scores logged yet</div>
              <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Go to <strong>Score Log</strong> and start logging to see predictions.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {[
                ['Predicted score', pred.score, '#16A34A'],
                ['Expected percentile', pred.percentile, cfg.color],
                ['Qualifying chance', pred.qualify, '#7C3AED'],
                ...(avgMock !== null ? [['Mock test avg', avgMock, '#D97706']] : []),
              ].map(([label, val, color]) => (
                <div key={String(label)}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span style={{ color: 'var(--muted)' }}>{label}</span>
                    <span className="font-semibold" style={{ color: String(color) }}>{val}{String(label).includes('score') ? '/100' : '%'}</span>
                  </div>
                  <Meter pct={Number(val)} color={String(color)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Performance analysis" />
          {scores.length < 5 ? (
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Log at least 5 daily scores to get a meaningful prediction.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Exam type', value: cfg.label },
                { label: 'Trend', value: <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{improving ? <TrendingUp size={14} color="#4ADE80" /> : <TrendingDown size={14} color="#F87171" />}{improving ? 'Improving' : 'Declining'}</span> },
                { label: 'Sessions logged', value: String(scores.length) },
                { label: 'Best score', value: `${Math.max(...scores.map(s => s.score))}%` },
                { label: '7-day avg', value: `${recent.length ? Math.round(recent.reduce((a, s) => a + s.score, 0) / recent.length) : 0}%` },
                { label: 'Mock tests', value: `${mocks.length} taken` },
                { label: 'PYQ chapters', value: `${(data.pyqData || []).length} tracked` },
                { label: 'Revision sessions', value: `${(data.revisions || []).length} logged` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[13px]">
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <strong style={{ color: 'var(--text)' }}>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {!pred.noData && pred.advice.length > 0 && (
        <div className="border-l-4 border-solid" style={{ borderLeftColor: cfg.color }}>
          <Card>
            <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} style={{ color: cfg.color }} /> Focus recommendation — highest impact {examType === 'NET' ? 'topics' : 'subjects'}</span>} />
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
              Based on {cfg.label} weightages, prioritise these to boost your score:
              <div className="mt-3 flex flex-col gap-2">
                {pred.advice.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-btn" style={{ background: 'var(--surface2)' }}>
                    <span style={{ color: cfg.color }}><Zap size={14} /></span>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
