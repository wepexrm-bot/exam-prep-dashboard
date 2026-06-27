'use client';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { BarChart3, TrendingUp, BookOpen, Target, AlertTriangle, Zap, Clock, Award } from 'lucide-react';
import { PageHeader, Card, CardHeader, MetricCard, Meter } from '@/components/ui';
import { getPct } from '@/lib/utils';
import { useExamConfig } from '@/lib/useExamConfig';

export default function InsightsPage() {
  const { data, examType } = useApp();
  const { config: cfg } = useExamConfig(examType);

  const subjects = data.subjects || [];
  const scores = data.dailyScores || [];
  const sessions = data.studySessions || [];
  const pyqData = data.pyqData || [];

  const weekSecs = useMemo(() => {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return sessions.filter(s => new Date(s.start) >= monday).reduce((a, s) => a + (s.durationSec || 0), 0);
  }, [sessions]);

  const totalSecs = useMemo(() => sessions.reduce((a, s) => a + (s.durationSec || 0), 0), [sessions]);
  const totalHours = Math.round(totalSecs / 36) / 100;
  const weekHours = Math.round(weekSecs / 36) / 100;

  const avgAccuracy = useMemo(() => {
    const all = scores.filter(s => s.accuracy != null);
    return all.length ? Math.round(all.reduce((a, s) => a + s.accuracy!, 0) / all.length) : 0;
  }, [scores]);

  const weakSubjects = useMemo(() => {
    return subjects
      .map(s => ({
        ...s,
        pctVal: getPct(s),
        pyqAccuracy: (() => {
          const chapters = pyqData.filter(p => p.key.startsWith(s.name + '::'));
          const all = chapters.flatMap(c => c.sessions.map(se => se.accuracy));
          return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
        })(),
      }))
      .filter(s => s.pctVal < 60 || (s.pyqAccuracy != null && s.pyqAccuracy < 50))
      .sort((a, b) => a.pctVal - b.pctVal);
  }, [subjects, pyqData]);

  const avgSubPct = subjects.length ? Math.round(subjects.reduce((a, s) => a + getPct(s), 0) / subjects.length) : 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <PageHeader title="Insights" sub={`Analytics overview for ${cfg.label}`} />
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
          background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', color: '#FB923C',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Beta</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <MetricCard label="Syllabus done" value={<>{avgSubPct}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} sub="Across all subjects" />
        <MetricCard label="Avg accuracy" value={<>{avgAccuracy}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} sub={scores.length ? `From ${scores.length} scores` : 'No scores'} />
        <MetricCard label="Total study" value={<>{totalHours}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>h</sup></>} sub="All time" />
        <MetricCard label="This week" value={<>{weekHours}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>h</sup></>} sub={`Target ${data.weeklyTarget || 12}h`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} style={{ color: '#FB923C' }} /> Weak areas</span>} />
          {weakSubjects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-[13px]" style={{ color: 'var(--muted)' }}>
              <Award size={32} strokeWidth={1.5} style={{ color: '#4ADE80' }} />
              No weak spots detected — you're on track!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {weakSubjects.map(s => (
                <div key={s.name} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span style={{ color: 'var(--text)' }}>{s.name}</span>
                    <span style={{ color: s.pctVal < 40 ? '#F87171' : '#FB923C', fontWeight: 700 }}>{s.pctVal}%</span>
                  </div>
                  <Meter pct={s.pctVal} color={s.pctVal < 40 ? '#F87171' : '#FB923C'} />
                  {s.pyqAccuracy != null && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      PYQ accuracy: <span style={{ color: s.pyqAccuracy < 40 ? '#F87171' : '#FB923C', fontWeight: 600 }}>{s.pyqAccuracy}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} style={{ color: '#22D3EE' }} /> Subject completion</span>} />
          <div className="flex flex-col gap-2.5">
            {subjects.length === 0 ? (
              <div className="text-[13px] py-4" style={{ color: 'var(--muted)' }}>No subjects added yet.</div>
            ) : (
              subjects.map(s => {
                const pct = getPct(s);
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span style={{ color: 'var(--text)' }}>{s.name}</span>
                      <span style={{ color: pct >= 80 ? '#4ADE80' : pct >= 50 ? '#FB923C' : '#F87171', fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <Meter pct={pct} color={pct >= 80 ? '#4ADE80' : pct >= 50 ? '#FB923C' : '#F87171'} />
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} style={{ color: '#A78BFA' }} /> Study breakdown</span>} />
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Total sessions</span><strong style={{ color: 'var(--text)' }}>{sessions.length}</strong></div>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Test scores logged</span><strong style={{ color: 'var(--text)' }}>{scores.length}</strong></div>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>PYQ chapters</span><strong style={{ color: 'var(--text)' }}>{pyqData.length}</strong></div>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>PYQ sessions</span><strong style={{ color: 'var(--text)' }}>{pyqData.reduce((a, p) => a + p.sessions.length, 0)}</strong></div>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Revisions logged</span><strong style={{ color: 'var(--text)' }}>{(data.revisions || []).length}</strong></div>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Weekly target</span><strong style={{ color: 'var(--text)' }}>{data.weeklyTarget || 12}h</strong></div>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} style={{ color: '#F472B6' }} /> Recommendations</span>} />
          <div className="flex flex-col gap-2 text-[13px]">
            {weekHours < (data.weeklyTarget || 12) && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(251,146,60,0.08)' }}>
                <span style={{ color: '#FB923C', flexShrink: 0, marginTop: 1 }}><Zap size={14} /></span>
                <span style={{ color: 'var(--text)' }}>You're behind your weekly study target. Try adding more study sessions.</span>
              </div>
            )}
            {weakSubjects.length > 0 && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)' }}>
                <span style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }}><AlertTriangle size={14} /></span>
                <span style={{ color: 'var(--text)' }}>Focus on <strong>{weakSubjects[0].name}</strong> — your weakest subject ({weakSubjects[0].pctVal}% done).</span>
              </div>
            )}
            {avgAccuracy > 0 && avgAccuracy < 60 && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)' }}>
                <span style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }}><TrendingUp size={14} /></span>
                <span style={{ color: 'var(--text)' }}>Your accuracy is {avgAccuracy}% — revise fundamentals and practice more PYQs.</span>
              </div>
            )}
            {avgSubPct >= 80 && weekHours >= (data.weeklyTarget || 12) && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.08)' }}>
                <span style={{ color: '#4ADE80', flexShrink: 0, marginTop: 1 }}><Award size={14} /></span>
                <span style={{ color: 'var(--text)' }}>Great pace! Keep up the consistency.</span>
              </div>
            )}
            {(weekHours === 0 && sessions.length === 0) && (
              <div className="text-center py-4" style={{ color: 'var(--muted)' }}>
                Start logging study sessions and scores to see personalized recommendations.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
