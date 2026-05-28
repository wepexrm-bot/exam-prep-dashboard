'use client';
import { useState, useEffect } from 'react';
import { Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { EXAM_CONFIG } from '@/lib/constants';

function today() { return new Date().toISOString().split('T')[0]; }
function getFullDate() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function ScoreModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addScore, examType } = useApp();
  const cfg = EXAM_CONFIG[examType];
  const [score, setScore] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [hours, setHours] = useState('');

  useEffect(() => {
    if (open) {
      const todayKey = today();
      const todaySess = (data.studySessions || []).filter(s => s.start?.split('T')[0] === todayKey);
      const totalSec = todaySess.reduce((a, s) => a + s.durationSec, 0);
      if (totalSec > 0) setHours(String(Math.round((totalSec / 3600) * 10) / 10));
    }
  }, [open, data.studySessions]);

  async function handleSave() {
    // Score and accuracy are optional — hours alone is enough to log activity
    if (!score && !hours) return showToast('Enter at least study hours or a score');
    await addScore({
      date: today(),
      score: Number(score) || 0,
      accuracy: Number(accuracy) || 0,
      hours: Number(hours) || 0,
    });
    showToast('Activity logged ✓');
    setScore(''); setAccuracy(''); setHours('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="📈 Log today's activity">
      <div className="px-3 py-1.5 rounded-btn mb-3 text-xs font-semibold"
        style={{ background: cfg.colorLight, color: cfg.color }}>📅 {getFullDate()}</div>

      {/* Study hours — most important, shown first */}
      <FormGroup label="Study hours" hint="auto-fills from timer">
        <input className="form-input" type="number" min="0" max="24" step="0.5"
          placeholder="e.g. 6 (or leave if using timer)"
          value={hours} onChange={e => setHours(e.target.value)} />
      </FormGroup>

      {/* Score and accuracy — optional */}
      <div style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: 'var(--muted)',
        margin: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span>Test performance</span>
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — only if you took a test today)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormGroup label="Score (%)">
          <input className="form-input" type="number" min="0" max="100"
            placeholder="e.g. 68"
            value={score} onChange={e => setScore(e.target.value)} />
        </FormGroup>
        <FormGroup label="Accuracy (%)">
          <input className="form-input" type="number" min="0" max="100"
            placeholder="e.g. 72"
            value={accuracy} onChange={e => setAccuracy(e.target.value)} />
        </FormGroup>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
        💡 Logging activity without a score still counts toward your study streak.
      </p>

      <ModalActions>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>Log activity</button>
      </ModalActions>
    </Modal>
  );
}

export function MockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMock, examType } = useApp();
  const cfg = EXAM_CONFIG[examType];
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('100');
  const [subject, setSubject] = useState(cfg.mockSubjects[0]);

  async function handleSave() {
    if (!score) return showToast('Enter a score');
    await addMock({ date: today(), score: Number(score), total: Number(total), subject });
    showToast('Mock test logged ✓');
    setScore(''); setTotal('100');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="📝 Add mock test result">
      <div className="px-3 py-1.5 rounded-btn mb-3 text-xs font-semibold"
        style={{ background: cfg.colorLight, color: cfg.color }}>📅 {getFullDate()}</div>
      <FormGroup label="Score obtained">
        <input className="form-input" type="number" placeholder="e.g. 52"
          value={score} onChange={e => setScore(e.target.value)} />
      </FormGroup>
      <FormGroup label="Total marks">
        <input className="form-input" type="number" placeholder="100"
          value={total} onChange={e => setTotal(e.target.value)} />
      </FormGroup>
      <FormGroup label="Subject / Type">
        <select className="form-input" value={subject} onChange={e => setSubject(e.target.value)}>
          {cfg.mockSubjects.map(s => <option key={s}>{s}</option>)}
        </select>
      </FormGroup>
      <ModalActions>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>Save result</button>
      </ModalActions>
    </Modal>
  );
}