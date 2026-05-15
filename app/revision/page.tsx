'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, MetricCard, Empty, Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { REVISION_INTERVALS } from '@/lib/constants';

function today() { return new Date().toISOString().split('T')[0]; }

export default function RevisionPage() {
  const { data, addRevision, markRevised, deleteRevision } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [intervalDays, setIntervalDays] = useState(7);
  const [notes, setNotes] = useState('');

  const revs = data.revisions || [];
  const subjects = data.subjects || [];
  const now = new Date();

  const due = revs.filter(r => {
    const next = new Date(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next <= now;
  });
  const soon = revs.filter(r => {
    const next = new Date(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next > now && (next.getTime() - now.getTime()) < 3 * 86400000;
  });
  const upToDate = revs.length - due.length - soon.length;

  async function handleSave() {
    if (!topic.trim()) return showToast('Enter a topic');
    await addRevision({ topic: topic.trim(), subject: subject || (subjects[0]?.name || 'General'), intervalDays, notes });
    showToast('Revision logged!');
    setTopic(''); setNotes('');
    setShowModal(false);
  }

  function getNextDate(r: typeof revs[0]) {
    const next = new Date(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next;
  }

  function RevCard({ r, idx }: { r: typeof revs[0]; idx: number }) {
    const next = getNextDate(r);
    const isDue = next <= now;
    const isSoon = !isDue && (next.getTime() - now.getTime()) < 3 * 86400000;
    const badgeClass = isDue ? 'badge-red' : isSoon ? 'badge-amber' : 'badge-green';
    const badgeText = isDue ? 'Overdue' : `Next: ${next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

    return (
      <div className="flex items-center gap-3 py-3 border-b last:border-0 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-[140px]">
          <div className="font-medium text-[13px]" style={{ color: 'var(--text)' }}>{r.topic}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {r.subject} · Every {r.intervalDays} days · Last: {r.lastRevised}
          </div>
          {r.notes && <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{r.notes}</div>}
        </div>
        <span className={`badge ${badgeClass}`}>{badgeText}</span>
        <button className="btn btn-sm btn-green" onClick={() => { markRevised(idx); showToast('Marked as revised ✓'); }}>✓ Revised</button>
        <button className="btn btn-sm" style={{ color: 'var(--danger)' }}
          onClick={() => { if (confirm('Remove this revision?')) deleteRevision(idx); }}>✕</button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Revision Log" sub="Spaced repetition tracker for all topics">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log revision</button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <MetricCard label="Total logged" value={revs.length} />
        <MetricCard label="Due now" value={<span style={{ color: due.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{due.length}</span>} subColor={due.length > 0 ? 'down' : 'up'} />
        <MetricCard label="Due in 3 days" value={<span style={{ color: soon.length > 0 ? '#D97706' : 'var(--success)' }}>{soon.length}</span>} />
        <MetricCard label="Up to date" value={<span style={{ color: 'var(--success)' }}>{upToDate}</span>} subColor="up" />
      </div>

      {due.length > 0 && (
        <Card className="mb-3 border-l-4 border-danger">
          <CardHeader title={`⚠ Due for revision NOW (${due.length})`} />
          {due.map(r => {
            const realIdx = revs.indexOf(r);
            return <RevCard key={realIdx} r={r} idx={realIdx} />;
          })}
        </Card>
      )}

      <Card>
        <CardHeader title={`All revision entries (${revs.length})`} />
        {revs.length === 0 && <Empty>No revisions logged yet. Start tracking your study sessions!</Empty>}
        {[...revs].reverse().map((r, i) => {
          const realIdx = revs.length - 1 - i;
          return <RevCard key={realIdx} r={r} idx={realIdx} />;
        })}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="🔄 Log Revision">
        <FormGroup label="Topic">
          <input className="form-input" type="text" placeholder="e.g. Deadlock in OS" value={topic}
            onChange={e => setTopic(e.target.value)} />
        </FormGroup>
        <FormGroup label="Subject">
          <select className="form-input" value={subject} onChange={e => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s.name}>{s.name}</option>)}
            <option value="General">General</option>
          </select>
        </FormGroup>
        <FormGroup label="Revision interval">
          <select className="form-input" value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))}>
            {REVISION_INTERVALS.map(d => <option key={d} value={d}>Every {d} days</option>)}
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
