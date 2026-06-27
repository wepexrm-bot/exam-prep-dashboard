'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AlertTriangle, RefreshCw, Check, Trash2, Brain } from 'lucide-react';
import { PageHeader, Card, CardHeader, MetricCard, Empty, Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { Confidence } from '@/lib/types';

function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function parseLocalDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

const CONFIDENCE_OPTIONS: { value: Confidence; label: string; color: string; bg: string }[] = [
  { value: 'hard', label: 'Hard', color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
  { value: 'medium', label: 'Medium', color: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
  { value: 'easy', label: 'Easy', color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
];

export default function RevisionPage() {
  const { data, addRevision, markRevised, deleteRevision } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [intervalDays, setIntervalDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [reviewingIdx, setReviewingIdx] = useState<number | null>(null);

  const revs = data.revisions || [];
  const subjects = data.subjects || [];
  const now = new Date();

  const selSubject = subjects.find(s => s.name === subject);
  const chapters = selSubject?.chapters || [];

  const due = revs.filter(r => {
    const next = parseLocalDate(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next <= now;
  });
  const soon = revs.filter(r => {
    const next = parseLocalDate(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next > now && (next.getTime() - now.getTime()) < 3 * 86400000;
  });
  const upToDate = revs.length - due.length - soon.length;

  async function handleSave() {
    if (intervalDays < 1) return showToast('Interval must be at least 1 day');
    await addRevision({
      topic: topic.trim(),
      subject: subject || (subjects[0]?.name || 'General'),
      chapter: chapter || undefined,
      intervalDays,
      notes,
    });
    showToast('Revision logged!');
    setTopic(''); setSubject(''); setChapter(''); setIntervalDays(1); setNotes('');
    setShowModal(false);
  }

  function handleReview(idx: number, confidence: Confidence) {
    markRevised(idx, confidence);
    setReviewingIdx(null);
    showToast(`Marked ${confidence}`);
  }

  function getNextDate(r: typeof revs[0]) {
    const next = parseLocalDate(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next;
  }

  function RevCard({ r, idx }: { r: typeof revs[0]; idx: number }) {
    const next = getNextDate(r);
    const isDue = next <= now;
    const isSoon = !isDue && (next.getTime() - now.getTime()) < 3 * 86400000;
    const badgeClass = isDue ? 'badge-red' : isSoon ? 'badge-amber' : 'badge-green';
    const badgeText = isDue ? 'Overdue' : `Next: ${next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    const isReviewing = reviewingIdx === idx;

    return (
      <div className="flex items-center gap-3 py-3 border-b last:border-0 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-[140px]">
          <div className="font-medium text-[13px]" style={{ color: 'var(--text)' }}>{r.topic}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {r.subject}{r.chapter ? ` · ${r.chapter}` : ''} · Every {r.intervalDays}d
            {r.repetitions > 0 && ` · Rep #${r.repetitions} · EF ${r.easinessFactor}`}
            {r.lastConfidence && ` · Last: ${r.lastConfidence}`}
          </div>
          {r.notes && <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{r.notes}</div>}
        </div>
        <span className={`badge ${badgeClass}`}>{badgeText}</span>

        {isReviewing ? (
          <div className="flex gap-1">
            {CONFIDENCE_OPTIONS.map(c => (
              <button key={c.value}
                onClick={() => handleReview(idx, c.value)}
                className="btn btn-sm"
                style={{ background: c.bg, color: c.color, border: 'none' }}
              >{c.label}</button>
            ))}
          </div>
        ) : (
          <button className="btn btn-sm btn-green" onClick={() => setReviewingIdx(idx)}>
            <Brain size={12} /> Review
          </button>
        )}

        <button className="btn btn-sm flex items-center gap-1" style={{ color: 'var(--danger)' }}
          onClick={() => { if (confirm('Remove this revision?')) deleteRevision(idx); }}><Trash2 size={12} /></button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Revision Log" sub="SM-2 spaced repetition with confidence-based scheduling">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log revision</button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <MetricCard label="Total logged" value={revs.length} />
        <MetricCard label="Due now" value={<span style={{ color: due.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{due.length}</span>} />
        <MetricCard label="Due in 3 days" value={<span style={{ color: soon.length > 0 ? '#D97706' : 'var(--success)' }}>{soon.length}</span>} />
        <MetricCard label="Up to date" value={<span style={{ color: 'var(--success)' }}>{upToDate}</span>} />
      </div>

      {due.length > 0 && (
        <Card className="mb-3 border-l-4 border-danger">
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} color="var(--danger)" /> Due for revision NOW ({due.length})</span>} />
          {due.map(r => {
            const realIdx = revs.indexOf(r);
            return <RevCard key={realIdx} r={r} idx={realIdx} />;
          })}
        </Card>
      )}

      <Card>
        <CardHeader title={`All revision entries (${revs.length})`} />
        {revs.length === 0 && <Empty>No revisions logged yet. Start tracking!</Empty>}
        {[...revs].reverse().map((r, i) => {
          const realIdx = revs.length - 1 - i;
          return <RevCard key={realIdx} r={r} idx={realIdx} />;
        })}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RefreshCw size={16} /> Log Revision</span>}>
        <FormGroup label="Topic">
          <input className="form-input" type="text" placeholder="e.g. Deadlock in OS" value={topic}
            onChange={e => setTopic(e.target.value)} />
        </FormGroup>
        <FormGroup label="Subject">
          <select className="form-input" value={subject} onChange={e => { setSubject(e.target.value); setChapter(''); }}>
            {subjects.map(s => <option key={s.name}>{s.name}</option>)}
            <option value="General">General</option>
          </select>
        </FormGroup>
        {chapters.length > 0 && (
          <FormGroup label="Chapter">
            <select className="form-input" value={chapter} onChange={e => setChapter(e.target.value)}>
              <option value="">All chapters</option>
              {chapters.map(c => <option key={c.name}>{c.name}</option>)}
            </select>
          </FormGroup>
        )}
        <FormGroup label="Initial interval" hint="SM-2 will adjust this automatically after each review">
          <select className="form-input" value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))}>
            {[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>Every {d} day{d > 1 ? 's' : ''}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Notes (optional)">
          <input className="form-input" type="text" placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Log revision</button>
        </ModalActions>
      </Modal>
    </>
  );
}
