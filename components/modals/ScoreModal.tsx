'use client';
import { TrendingUp, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useExamConfig } from '@/lib/useExamConfig';
import { today, dateKey } from '@/lib/utils';

function getFullDate() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function ScoreModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addScore, examType } = useApp();
  const { config: cfg } = useExamConfig(examType);
  const subjectOptions = (data.subjects || []).map(s => s.name);

  const [title, setTitle] = useState('');
  const [testType, setTestType] = useState<'full' | 'subject'>('full');
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [accuracy, setAccuracy] = useState('');
  const [hours, setHours] = useState('');
  const [rank, setRank] = useState('');
  const [percentile, setPercentile] = useState('');

  useEffect(() => {
    if (open) {
      const todayKey = today();
      const todaySess = (data.studySessions || []).filter(s => s.start && dateKey(new Date(s.start)) === todayKey);
      const totalSec = todaySess.reduce((a, s) => a + s.durationSec, 0);
      if (totalSec > 0) setHours(String(Math.round((totalSec / 3600) * 10) / 10));
      if (!subject && subjectOptions.length) setSubject(subjectOptions[0]);
    }
  }, [open, data.studySessions, subjectOptions, subject]);

  async function handleSave() {
    if (!title.trim() && !hours) return showToast('Enter a test title or study hours');
    await addScore({
      date: today(),
      title: title.trim() || undefined,
      score: Number(score) || 0,
      totalMarks: Number(totalMarks) || 100,
      accuracy: Number(accuracy) || 0,
      hours: Number(hours) || 0,
      rank: rank ? Number(rank) : undefined,
      percentile: percentile ? Number(percentile) : undefined,
      subject: testType === 'subject' ? subject : undefined,
    });
    showToast('Score logged');
    setTitle(''); setScore(''); setTotalMarks('100'); setAccuracy(''); setHours('');
    setRank(''); setPercentile(''); setTestType('full');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} /> Log score</span>}>
      <div className="px-3 py-1.5 rounded-btn mb-3 text-xs font-semibold flex items-center gap-1.5"
        style={{ background: cfg.colorLight, color: cfg.color }}><Calendar size={12} /> {getFullDate()}</div>

      <FormGroup label="Test title">
        <input className="form-input" type="text"
          placeholder="e.g. Full Length Mock-3, Subject Test"
          value={title} onChange={e => setTitle(e.target.value)} />
      </FormGroup>

      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8 }}>
        Test type
      </div>
      <div className="flex gap-2 mb-4" id="test-type-toggle">
        <button
          onClick={() => setTestType('full')}
          className={`px-3 py-1.5 rounded-btn text-xs font-bold transition ${testType === 'full' ? 'bg-blue-600 text-white' : 'bg-transparent border border-[var(--border)] text-[var(--muted)]'}`}
        >Full mock</button>
        <button
          onClick={() => setTestType('subject')}
          className={`px-3 py-1.5 rounded-btn text-xs font-bold transition ${testType === 'subject' ? 'bg-blue-600 text-white' : 'bg-transparent border border-[var(--border)] text-[var(--muted)]'}`}
        >Subject-wise</button>
      </div>

      {testType === 'subject' && (
        <FormGroup label="Subject">
          <select className="form-input" value={subject} onChange={e => setSubject(e.target.value)}>
            {subjectOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormGroup>
      )}

      <FormGroup label="Study hours" hint="auto-fills from timer">
        <input className="form-input" type="number" min="0" max="24" step="0.5"
          placeholder="e.g. 6"
          value={hours} onChange={e => setHours(e.target.value)} />
      </FormGroup>

      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: '14px 0 10px' }}>
        Marks
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FormGroup label="Scored">
          <input className="form-input" type="number" min="0" step="0.25"
            placeholder="e.g. 68"
            value={score} onChange={e => setScore(e.target.value)} />
        </FormGroup>
        <FormGroup label="Total">
          <input className="form-input" type="number" min="1"
            placeholder="100"
            value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
        </FormGroup>
        <FormGroup label="Accuracy %">
          <input className="form-input" type="number" min="0" max="100"
            placeholder="e.g. 72"
            value={accuracy} onChange={e => setAccuracy(e.target.value)} />
        </FormGroup>
      </div>

      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: '14px 0 10px' }}>
        Rank & percentile (optional)
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Rank">
          <input className="form-input" type="number" min="1"
            placeholder="e.g. 210"
            value={rank} onChange={e => setRank(e.target.value)} />
        </FormGroup>
        <FormGroup label="Percentile %">
          <input className="form-input" type="number" min="0" max="100" step="0.01"
            placeholder="e.g. 99.4"
            value={percentile} onChange={e => setPercentile(e.target.value)} />
        </FormGroup>
      </div>

      <ModalActions>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>Log score</button>
      </ModalActions>
    </Modal>
  );
}

