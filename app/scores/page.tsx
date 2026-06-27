'use client';
import { useState, useMemo, useEffect, FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { TrendingUp, Plus, Trash2, Award, Target, GraduationCap, HelpCircle, X } from 'lucide-react';
import { showToast } from '@/components/ui';
import { today } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function pct(score: number, total?: number): number {
  return total && total > 0 ? (score / total) * 100 : score;
}

const C = {
  surface: '#14161A', card: '#181B22', border: 'rgba(34,211,238,0.06)',
  borderStrong: 'rgba(34,211,238,0.12)', input: '#111318',
  text: '#F1F5F9', muted: '#7C8089', mutedSoft: '#9CA3AF',
  cyan: '#22D3EE', cyanDim: 'rgba(34,211,238,0.1)', cyanBorder: 'rgba(34,211,238,0.2)',
  inputFocus: 'rgba(34,211,238,0.5)',
  blue: '#3B82F6', blueLight: 'rgba(59,130,246,0.1)', blueBorder: 'rgba(59,130,246,0.2)',
  green: '#4ADE80', purple: '#A78BFA', amber: '#F59E0B', red: '#F87171',
};

export default function ScoresPage() {
  const { data, addScore, deleteScore } = useApp();
  const subjectNames = useMemo(() => (data.subjects || []).map(s => s.name), [data.subjects]);

  const scores = useMemo(() => [...(data.dailyScores || [])].reverse(), [data.dailyScores]);
  const scoresAsc = useMemo(() => [...(data.dailyScores || [])].sort((a, b) => a.date.localeCompare(b.date)), [data.dailyScores]);

  const averageScorePercent = useMemo(() => {
    const withTotal = scores.filter(s => s.totalMarks && s.totalMarks > 0);
    if (withTotal.length === 0) return 0;
    const percentages = withTotal.map(s => pct(s.score, s.totalMarks));
    return Math.round(percentages.reduce((a, p) => a + p, 0) / withTotal.length);
  }, [scores]);

  const topScore = useMemo(() => {
    if (scores.length === 0) return 0;
    return Math.max(...scores.map(s => s.score));
  }, [scores]);

  const [title, setTitle] = useState('');
  const [fScore, setFScore] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState<number | ''>('');
  const [accuracy, setAccuracy] = useState<number | ''>('');
  const [rank, setRank] = useState<number | ''>('');
  const [percentile, setPercentile] = useState<number | ''>('');
  const [subjectWise, setSubjectWise] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  useEffect(() => {
    if (!selectedSubject && subjectNames.length > 0) setSelectedSubject(subjectNames[0]);
  }, [subjectNames, selectedSubject]);

  const subjectSet = useMemo(() => {
    const set = new Set<string>();
    data.dailyScores.forEach(s => { if (s.subject) set.add(s.subject); });
    return Array.from(set).sort();
  }, [data.dailyScores]);

  const [showHelp, setShowHelp] = useState(false);
  const [chartSubject, setChartSubject] = useState('__all__');

  const chartData = useMemo(() => {
    const base = chartSubject === '__all__' ? scoresAsc : scoresAsc.filter(s => s.subject === chartSubject);
    return base.filter(s => s.totalMarks).map(s => ({
      date: s.date.slice(5),
      pct: Math.round(pct(s.score, s.totalMarks) * 10) / 10,
      label: s.title || s.date,
    }));
  }, [scoresAsc, chartSubject]);

  const chartSubjectOptions = useMemo(() => {
    return [{ key: '__all__', label: 'Full Syllabus' }, ...subjectSet.map(s => ({ key: s, label: s }))];
  }, [subjectSet]);

  function handleAddScore(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return showToast('Enter a test title');
    if (fScore === '' || totalMarks === '' || accuracy === '') return showToast('Fill in scored, total, and accuracy');
    const trimmed = title.trim();
    const todayStr = today();
    if (data.dailyScores?.some(s => s.title === trimmed && s.date === todayStr)) return showToast(`"${trimmed}" already exists today — use a different title`);
    addScore({
      date: today(), title: trimmed,
      score: Number(fScore), totalMarks: Number(totalMarks),
      accuracy: Number(accuracy), hours: 0,
      rank: rank !== '' ? Number(rank) : undefined,
      percentile: percentile !== '' ? Number(percentile) : undefined,
      subject: subjectWise ? selectedSubject : undefined,
    });
    setTitle(''); setRank(''); setPercentile('');
    setFScore(''); setTotalMarks(''); setAccuracy('');
    setSubjectWise(false); setSelectedSubject('');
    showToast('Mock score logged');
  }

  function handleDeleteScore(scoreDate: string, scoreTitle?: string) {
    if (confirm(`Delete entry ${scoreTitle ? `"${scoreTitle}" ` : ''}for ${scoreDate}?`)) {
      deleteScore(scoreDate, scoreTitle);
      showToast('Entry deleted');
    }
  }

  return (
    <div className="sp-wrap">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 className="sp-title">Score Performance Log</h2>
          <p className="sp-sub">Track mock test results, ranks, and subject-wise performance trends.</p>
        </div>
        <button onClick={() => setShowHelp(true)}
          style={{
            background: C.cyanDim, border: `1px solid ${C.cyanBorder}`, borderRadius: 10,
            padding: '8px 10px', cursor: 'pointer', color: C.cyan, display: 'flex',
            alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
          <HelpCircle size={14} /> Tips
        </button>
      </div>

      {/* ── Metric cards ── */}
      <div className="sp-metrics-grid">
        {[
          { label: 'AVERAGE TOTAL', value: `${averageScorePercent}%`, sub: 'cumulative avg', icon: <GraduationCap size={17} />, ic: C.cyan, ib: C.cyanDim, ibdr: C.cyanBorder },
          { label: 'TOP SCORE', value: topScore, sub: 'highest marks', icon: <Award size={17} />, ic: C.green, ib: 'rgba(74,222,128,0.1)', ibdr: 'rgba(74,222,128,0.2)' },
          { label: 'ATTEMPTS', value: scores.length, sub: 'tests logged', icon: <Target size={17} />, ic: C.purple, ib: 'rgba(167,139,250,0.1)', ibdr: 'rgba(167,139,250,0.2)' },
        ].map(m => (
          <div key={m.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="sp-metric-label">{m.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span className="sp-metric-value" style={{ color: m.value === topScore ? C.green : C.text }}>{m.value}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{m.sub}</span>
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: m.ib, border: `1px solid ${m.ibdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.ic }}>
              {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Score Trends Chart ─── */}
      <div className="sp-card" style={{ marginTop: 16 }}>
        <div className="sp-chart-header">
          <div className="sp-chart-title"><TrendingUp size={14} color={C.cyan} /> Score Trends</div>
          {chartSubjectOptions.length > 1 && (
            <select value={chartSubject} onChange={e => setChartSubject(e.target.value)}
              style={{
                background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '4px 10px', fontSize: 11, fontWeight: 600, color: C.text,
                outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {chartSubjectOptions.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          )}
        </div>

        {chartData.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: C.muted, fontSize: 12 }}>
            {chartData.length === 0
              ? `No ${chartSubject === '__all__' ? '' : `${chartSubject} `}scores yet. Log some tests to see trends.`
              : 'Need at least 2 data points to show a trend.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderStrong} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.muted }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.muted }} />
              <Tooltip contentStyle={{ background: '#1A1D24', border: `1px solid ${C.cyanBorder}`, borderRadius: 10, fontSize: 12, color: C.text }} labelStyle={{ color: C.muted, fontSize: 11 }} />
              <Area type="monotone" dataKey="pct" stroke={C.cyan} strokeWidth={2} fill="url(#sg)" dot={{ r: 3, fill: C.cyan, stroke: C.surface, strokeWidth: 1.5 }} name="Score %" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── Two-column layout: Form + Logs ─── */}
      <div className="sp-main-grid" style={{ marginTop: 16 }}>

        {/* ── Form ── */}
        <div className="sp-card sp-card-form">
          <h3 className="sp-section-title">Log Paper Grade</h3>
          <form onSubmit={handleAddScore}>

            <div style={{ marginBottom: 14 }}>
              <label className="sp-label">Test Title</label>
              <input type="text" required placeholder="e.g. Full Length Mock-3" value={title} onChange={e => setTitle(e.target.value)} className="sp-input" />
            </div>

            <div className="sp-classify-grid" style={{ marginBottom: 14 }}>
              <div>
                <label className="sp-label">Classification</label>
                <div className="sp-toggle-group">
                  <button type="button" onClick={() => setSubjectWise(false)}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'inherit', background: !subjectWise ? C.cyan : 'transparent', color: !subjectWise ? '#0F172A' : C.mutedSoft }}>
                    Full Mock
                  </button>
                  <button type="button" onClick={() => setSubjectWise(true)}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'inherit', background: subjectWise ? C.cyan : 'transparent', color: subjectWise ? '#0F172A' : C.mutedSoft }}>
                    Subject-Wise
                  </button>
                </div>
              </div>
              {subjectWise && (
                <div>
                  <label className="sp-label">Target Subject</label>
                  <select value={selectedSubject || subjectNames[0] || ''} onChange={e => setSelectedSubject(e.target.value)}
                    style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 12, outline: 'none', color: C.text, cursor: 'pointer', boxSizing: 'border-box', height: 34, fontFamily: 'inherit' }}>
                    {subjectNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="sp-marks-grid" style={{ marginBottom: 14 }}>
              {[
                { label: 'Scored', v: fScore, set: setFScore, min: 0, step: 0.25, ph: 'e.g. 52' },
                { label: 'Total', v: totalMarks, set: setTotalMarks, min: 1, step: 1, ph: 'e.g. 100' },
                { label: 'Accuracy %', v: accuracy, set: setAccuracy, min: 0, max: 100, step: 1, ph: 'e.g. 72' },
              ].map(f => (
                <div key={f.label}>
                  <label className="sp-label">{f.label}</label>
                  <input type="number" min={f.min} max={'max' in f ? (f as any).max : undefined} step={f.step} required value={f.v} onChange={e => f.set(e.target.value === '' ? '' : Number(e.target.value))} placeholder={f.ph} className="sp-input sp-input-mono" />
                </div>
              ))}
            </div>

            <div className="sp-rank-grid" style={{ marginBottom: 18 }}>
              {[
                { label: 'Rank (optional)', v: rank, set: setRank, placeholder: 'e.g. 210', step: 1 },
                { label: 'Percentile % (optional)', v: percentile, set: setPercentile, placeholder: 'e.g. 99.4', step: 0.01 },
              ].map(f => (
                <div key={f.label}>
                  <label className="sp-label">{f.label}</label>
                  <input type="number" step={f.step} min={0} placeholder={f.placeholder} value={f.v} onChange={e => f.set(e.target.value === '' ? '' : Number(e.target.value))} className="sp-input sp-input-mono" />
                </div>
              ))}
            </div>

            <button type="submit" className="sp-submit">
              <Plus size={14} /> Log Mock Score Sheet
            </button>
          </form>
        </div>

        {/* ── Logs ── */}
        <div className="sp-card sp-card-logs">
          <h3 className="sp-section-title"><TrendingUp size={14} color={C.cyan} /> <span>Scoreboard logs</span></h3>
          <div className="sp-scroll">
            {scores.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>No scores logged yet. Fill out the form to get started.</div>
            )}
            {scores.map(s => {
              const p = pct(s.score, s.totalMarks);
              const barColor = p >= 80 ? C.green : p >= 65 ? C.cyan : p >= 50 ? C.amber : C.red;
              const isSub = !!s.subject;
              return (
                <div key={s.date + (s.title || '')} className="sp-entry">
                  <div className="sp-entry-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sp-entry-header">
                        <span className={`sp-badge ${isSub ? 'sp-badge-sub' : 'sp-badge-full'}`}
                          style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.03em',
                            background: isSub ? 'rgba(167,139,250,0.12)' : C.cyanDim,
                            color: isSub ? C.purple : C.cyan,
                            border: `1px solid ${isSub ? 'rgba(167,139,250,0.1)' : C.cyanBorder}`,
                          }}>{isSub ? s.subject : 'Full Mock'}</span>
                        <span className="sp-entry-title">{s.title || (isSub ? `${s.subject} Test` : 'Study session')}</span>
                      </div>
                      <p className="sp-entry-meta">{s.date} &middot; {Math.round((s.hours || 0) * 60 || 180)} min</p>
                    </div>
                    <div className="sp-entry-right">
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span className="sp-entry-score">{s.score}</span>
                        <span className="sp-entry-total">/{s.totalMarks || '—'}</span>
                      </div>
                      {s.percentile && <span className="sp-pctile-badge">{s.percentile}%tile</span>}
                      <button onClick={() => handleDeleteScore(s.date, s.title)} className="sp-delete-btn"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="sp-info-bar">
                    <span>{s.rank ? `Rank: #${s.rank}` : 'Subject Evaluation'}</span>
                    <span>Acc: {s.accuracy}%</span>
                  </div>
                  <div className="sp-progress-track">
                    <div className="sp-progress-fill" style={{ width: `${Math.min(100, p)}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .sp-wrap {
          padding: 20px 24px;
          background: ${C.surface};
          color: ${C.text};
          min-height: 100%;
          box-sizing: border-box;
        }
        .sp-wrap * { box-sizing: border-box; }

        .sp-title { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 2px; }
        .sp-sub  { color: ${C.muted}; font-size: 13px; margin: 0 0 16px; }

        /* ── Layout grids (all class-based for clean responsive) ── */
        .sp-metrics-grid { display: grid; gap: 12px; }
        .sp-main-grid    { display: grid; gap: 16px; }
        .sp-marks-grid   { display: grid; gap: 10px; }
        .sp-rank-grid    { display: grid; gap: 14px; }
        .sp-classify-grid { display: grid; gap: 14px; }

        /* Default: single column (smallest screens) */
        .sp-metrics-grid  { grid-template-columns: 1fr; }
        .sp-main-grid     { grid-template-columns: 1fr; }
        .sp-marks-grid    { grid-template-columns: 1fr; }
        .sp-rank-grid     { grid-template-columns: 1fr; }
        .sp-classify-grid { grid-template-columns: 1fr; }

        @media (min-width: 640px) {
          .sp-marks-grid  { grid-template-columns: repeat(3, 1fr); }
          .sp-rank-grid   { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 768px) {
          .sp-metrics-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .sp-main-grid { grid-template-columns: 5fr 7fr; }
        }

        /* ── Cards ── */
        .sp-card {
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 16px;
          padding: 18px 20px;
        }
        .sp-card-form { height: fit-content; }
        .sp-card-logs  { display: flex; flex-direction: column; min-height: 0; }

        .sp-section-title {
          font-size: 13px;
          font-weight: 700;
          color: ${C.text};
          margin: 0 0 14px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Chart ── */
        .sp-chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .sp-chart-title {
          font-size: 13px;
          font-weight: 700;
          color: ${C.text};
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @media (max-width: 480px) {
          .sp-chart-header select { max-width: 160px; }
        }

        /* ── Inputs ── */
        .sp-input {
          width: 100%;
          background: ${C.input};
          border: 1px solid ${C.border};
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          outline: none;
          color: ${C.text};
          font-family: inherit;
          transition: border-color 0.15s;
        }
        .sp-input:focus { border-color: ${C.inputFocus}; box-shadow: 0 0 10px rgba(34,211,238,0.08); }
        .sp-input-mono { font-family: 'JetBrains Mono', monospace; text-align: center; padding-left: 4px; padding-right: 4px; }

        .sp-label {
          font-size: 9px; color: ${C.muted}; font-weight: 700; text-transform: uppercase;
          display: block; margin-bottom: 4px; letter-spacing: 0.04em;
        }
        .sp-toggle-group {
          display: flex; gap: 3px; border: 1px solid ${C.border}; border-radius: 10px;
          padding: 3px; background: ${C.input};
        }
        .sp-submit {
          width: 100%; background: ${C.cyan}; color: #0F172A; font-weight: 700; font-size: 12px;
          padding: 10px 0; border-radius: 10px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          box-shadow: 0 4px 14px ${C.cyanDim}; font-family: inherit;
        }
        .sp-submit:hover { opacity: 0.9; }

        .sp-metric-label { font-size: 10px; color: ${C.muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .sp-metric-value { font-size: 22px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

        /* ── Entries ── */
        .sp-scroll { flex: 1; overflow-y: auto; padding-right: 4px; }
        .sp-scroll::-webkit-scrollbar { width: 4px; }
        .sp-scroll::-webkit-scrollbar-track { background: transparent; }
        .sp-scroll::-webkit-scrollbar-thumb { background: ${C.borderStrong}; border-radius: 99px; }
        .sp-scroll::-webkit-scrollbar-thumb:hover { background: ${C.cyan}; }

        .sp-entry {
          padding: 14px; border-radius: 12px; background: #0E1116;
          border: 1px solid ${C.border}; margin-bottom: 10px;
        }
        .sp-entry:last-child { margin-bottom: 0; }
        .sp-entry-row {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
        }
        .sp-entry-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .sp-entry-title { font-size: 12px; font-weight: 700; color: ${C.text}; line-height: 1.3; }
        .sp-entry-meta  { font-size: 10px; color: ${C.muted}; margin: 3px 0 0 0; }
        .sp-entry-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .sp-entry-score { font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: ${C.text}; }
        .sp-entry-total { font-size: 10px; color: ${C.muted}; font-family: 'JetBrains Mono', monospace; }

        .sp-pctile-badge {
          font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 4px; white-space: nowrap;
          background: ${C.blueLight}; color: ${C.blue}; border: 1px solid ${C.blueBorder};
        }
        .sp-delete-btn {
          padding: 3px; background: none; border: none; cursor: pointer; color: ${C.muted}; font-size: 12px; flex-shrink: 0;
        }
        .sp-info-bar {
          margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
          background: ${C.input}; padding: 6px 10px; border-radius: 8px; font-size: 9px; color: ${C.muted};
          font-family: 'JetBrains Mono', monospace; font-weight: 600;
        }
        .sp-progress-track { margin-top: 6px; height: 2px; border-radius: 99px; background: ${C.borderStrong}; overflow: hidden; }
        .sp-progress-fill  { height: 100%; border-radius: 99px; transition: width 0.3s; }

        @media (max-width: 480px) {
          .sp-wrap { padding: 14px 16px; }
          .sp-title { font-size: 18px; }
          .sp-entry { padding: 12px; }
          .sp-entry-row { flex-direction: column; }
          .sp-entry-right { align-self: flex-end; }
        }
        .sp-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .sp-overlay-content {
          background: #1A1D24; border: 1px solid ${C.cyanBorder}; border-radius: 16px;
          max-width: 560px; width: 100%; max-height: 80vh; overflow-y: auto;
          padding: 24px; position: relative;
        }
        .sp-overlay-content::-webkit-scrollbar { width: 4px; }
        .sp-overlay-content::-webkit-scrollbar-thumb { background: ${C.borderStrong}; border-radius: 99px; }
        .sp-overlay-content h3 { margin: 0 0 16px; font-size: 15px; color: ${C.text}; }
        .sp-overlay-content h4 { margin: 14px 0 6px; font-size: 12px; color: ${C.cyan}; }
        .sp-overlay-content p, .sp-overlay-content li { font-size: 12px; color: ${C.mutedSoft}; line-height: 1.6; margin: 0 0 4px; }
        .sp-overlay-content ul { margin: 4px 0 0; padding-left: 18px; }
        .sp-overlay-content kbd {
          background: ${C.input}; border: 1px solid ${C.border}; border-radius: 4px;
          padding: 1px 6px; font-size: 10px; font-family: 'JetBrains Mono', monospace; color: ${C.cyan};
        }
      `}</style>

      {showHelp && (
        <div className="sp-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHelp(false); }}>
          <div className="sp-overlay-content">
            <button onClick={() => setShowHelp(false)}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}>
              <X size={16} />
            </button>

            <h3>How to Use the Score Log</h3>

            <h4>Logging a Score</h4>
            <p>Fill out the <strong>Log Paper Grade</strong> form on the left. Every entry needs a <strong>test title</strong>, the marks you <strong>scored</strong>, the <strong>total marks</strong>, and your <strong>accuracy</strong> percentage. Then click "Log Mock Score Sheet".</p>

            <h4>Full Mock vs Subject-Wise</h4>
            <ul>
              <li><strong>Full Mock</strong> — a full-syllabus test covering all subjects. No subject tag is attached.</li>
              <li><strong>Subject-Wise</strong> — a test focused on a single subject. Pick the subject from the dropdown that appears. This lets the chart show trends per subject.</li>
            </ul>

            <h4>Rank &amp; Percentile</h4>
            <p>These are optional. If you know your rank or percentile from a test, enter them. They will be displayed on the scoreboard entry and help you track your standing over time.</p>

            <h4>Score Trends Chart</h4>
            <p>Use the <strong>dropdown</strong> above the chart to switch between <strong>Full Syllabus</strong> (all scores) or a <strong>specific subject</strong>. The more consistently you log scores, the more meaningful the trend becomes. The chart requires at least 2 data points to draw a line.</p>

            <h4>Tips for Better Graphical Output</h4>
            <ul>
              <li>Log every test immediately after taking it — don't skip entries.</li>
              <li>Always fill the <strong>accuracy</strong> field — it appears in the scoreboard info bar.</li>
              <li>Use <strong>Subject-Wise</strong> mode for subject-specific tests so the chart can break down performance per subject.</li>
              <li>Add your <strong>rank</strong> and <strong>percentile</strong> when available — they give context to the raw score.</li>
              <li>The more data points you enter, the smoother and more useful the trend line becomes.</li>
            </ul>

            <h4>Managing Entries</h4>
            <p>Click the <kbd>🗑️</kbd> icon on any scoreboard entry to delete it. You will be asked to confirm before the entry is removed.</p>
          </div>
        </div>
      )}
    </div>
  );
}
