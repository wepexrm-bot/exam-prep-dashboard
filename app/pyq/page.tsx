'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { PYQChapter, PYQSession } from '@/lib/types';

function today() { return new Date().toISOString().split('T')[0]; }

function accColor(a: number) {
  return a >= 75 ? 'var(--green)' : a >= 50 ? 'var(--amber)' : 'var(--coral)';
}
function accBg(a: number) {
  return a >= 75 ? 'var(--green-light)' : a >= 50 ? 'var(--amber-light)' : 'var(--coral-light)';
}

function getStats(d: PYQChapter) {
  if (!d?.sessions?.length) return null;
  const att = d.sessions.reduce((a, s) => a + s.attempted, 0);
  const cor = d.sessions.reduce((a, s) => a + s.correct, 0);
  const pct = d.total > 0 ? Math.min(100, Math.round((att / d.total) * 100)) : 0;
  const acc = att > 0 ? Math.round((cor / att) * 100) : 0;
  return { att, cor, pct, acc, isComplete: att >= d.total, remaining: Math.max(0, d.total - att) };
}

export default function PYQPage() {
  const { data, addPYQSession, deletePYQSession } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selSubject, setSelSubject] = useState('');
  const [selChapter, setSelChapter] = useState('');
  const [total, setTotal] = useState('');
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const subjects = data.subjects || [];
  const pyqData: PYQChapter[] = data.pyqData || [];

  const allStats = pyqData.map(d => getStats(d)).filter(Boolean) as NonNullable<ReturnType<typeof getStats>>[];
  const totalSessions = pyqData.reduce((a, d) => a + (d.sessions?.length || 0), 0);
  const chaptersComplete = allStats.filter(s => s.isComplete).length;
  const totalSolved = allStats.reduce((a, s) => a + s.att, 0);
  const totalQs = pyqData.reduce((a, d) => a + (d.total || 0), 0);
  const totalCorrect = allStats.reduce((a, s) => a + s.cor, 0);
  const overallAcc = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  const chaptersForSubject = selSubject
    ? (subjects.find((s) => s.name === selSubject)?.chapters || [])
    : [];

  function openModal() {
    setSelSubject(subjects[0]?.name || '');
    setSelChapter('');
    setTotal(''); setAttempted(''); setCorrect('');
    setShowModal(true);
  }

  async function handleSave() {
    const chapter = selChapter || chaptersForSubject[0]?.name;
    if (!chapter) return showToast('Select a chapter — add chapters in Subject Progress first');
    if (!total) return showToast('Enter total questions in this chapter');
    if (!attempted) return showToast('Enter questions attempted this session');
    const acc = correct && attempted ? Math.round((Number(correct) / Number(attempted)) * 100) : 0;
    await addPYQSession(`${selSubject}::${chapter}`, Number(total), {
      attempted: Number(attempted), correct: Number(correct), accuracy: acc, date: today()
    });
    showToast(`Session added to ${chapter}!`);
    setShowModal(false);
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>PYQ Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            Chapter-wise sessions · progress auto-accumulates across sessions
          </p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>+ Add session</button>
      </div>

      {/* INFO BANNER */}
      <div style={{
        background: 'var(--surface2)', borderRadius: 8,
        padding: '10px 14px', fontSize: 12, color: 'var(--muted)',
        marginBottom: 14, lineHeight: 1.7
      }}>
        📌 Progress shows <strong>total solved / total questions</strong> across all sessions.
        Accuracy is weighted. Set number increments each time you complete all questions.
      </div>

      {/* SUMMARY METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        <div className="metric">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>Total sessions</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{totalSessions}</div>
        </div>
        <div className="metric">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>Chapters complete</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)' }}>{chaptersComplete}</div>
        </div>
        <div className="metric">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>Total solved</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>
            {totalSolved}<sup style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/{totalQs}</sup>
          </div>
        </div>
        <div className="metric">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>Overall accuracy</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: accColor(overallAcc) }}>{overallAcc}%</div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {pyqData.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No PYQ sessions yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1.25rem' }}>
            Start logging chapter-wise PYQ sessions
          </div>
          <button className="btn btn-primary" onClick={openModal}>+ Log your first session</button>
        </div>
      )}

      {/* SUBJECT GROUPS */}
      {subjects.map((subj) => {
        const subjChaps = pyqData.filter((p) => p.key?.startsWith(subj.name + '::') && p.sessions?.length > 0);
        if (!subjChaps.length) return null;

        const subjStats = subjChaps.map((c) => getStats(c)).filter(Boolean) as NonNullable<ReturnType<typeof getStats>>[];
        const subjAtt = subjStats.reduce((a, s) => a + s.att, 0);
        const subjCor = subjStats.reduce((a, s) => a + s.cor, 0);
        const subjAcc = subjAtt > 0 ? Math.round((subjCor / subjAtt) * 100) : 0;

        return (
          <div key={subj.name} style={{ marginBottom: 20 }}>
            {/* Subject header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {subj.name}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px',
                borderRadius: 99, background: accBg(subjAcc), color: accColor(subjAcc)
              }}>avg accuracy: {subjAcc}%</span>
            </div>

            {/* Chapter rows */}
            {subjChaps.map((chap) => {
              const st = getStats(chap);
              if (!st) return null;
              const chapName = chap.key.split('::')[1];
              const isOpen = openKey === chap.key;
              const barColor = st.isComplete ? '#16A34A' : st.pct >= 50 ? '#CA8A04' : '#2563EB';
              const dotColor = st.isComplete ? 'var(--green)' : st.att > 0 ? 'var(--amber)' : 'var(--muted)';
              const setLabel = st.isComplete ? 'Set 1' : 'In progress';
              const setColor = st.isComplete ? 'var(--green)' : 'var(--amber)';
              const setBg = st.isComplete ? 'var(--green-light)' : 'var(--amber-light)';

              return (
                <div key={chap.key} style={{ marginBottom: 6 }}>
                  {/* Chapter card */}
                  <div
                    className="card"
                    style={{ padding: '10px 14px', cursor: 'pointer', marginBottom: 0 }}
                    onClick={() => setOpenKey(isOpen ? null : chap.key)}
                  >
                    {/* Row 1: dot + name + set badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', minWidth: 0, wordBreak: 'break-word' }}>
                        {chapName}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 99, background: setBg, color: setColor, flexShrink: 0
                      }}>{setLabel}</span>
                      <span style={{ fontSize: 14, color: 'var(--muted)', flexShrink: 0 }}>📋</span>
                    </div>

                    {/* Row 2: progress bar */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: barColor }}>{st.att} / {chap.total}</span>
                        <span style={{ color: 'var(--muted)' }}>{st.remaining > 0 ? `${st.remaining} left` : '✓ done'}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${st.pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                    </div>

                    {/* Row 3: accuracy */}
                    {st.att > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Accuracy:</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '1px 8px',
                          borderRadius: 99, background: accBg(st.acc), color: accColor(st.acc)
                        }}>{st.acc}%</span>
                      </div>
                    )}
                  </div>

                  {/* Session breakdown */}
                  {isOpen && (
                    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', marginTop: 4 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {chap.sessions.length} session{chap.sessions.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                          {st.cor}/{st.att} correct = {st.acc}%
                        </span>
                      </div>

                      {chap.sessions.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>No sessions logged</div>
                      )}

                      {chap.sessions.map((s: PYQSession, i: number) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 0', flexWrap: 'wrap',
                          borderBottom: i < chap.sessions.length - 1 ? '1px solid var(--border)' : 'none'
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', minWidth: 60 }}>Session {i + 1}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>
                            {s.attempted} attempted · {s.correct} correct
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '1px 8px',
                            borderRadius: 99, background: accBg(s.accuracy), color: accColor(s.accuracy), flexShrink: 0
                          }}>{s.accuracy}%</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deletePYQSession(chap.key, i); }}
                            style={{
                              background: 'none', border: 'none', color: 'var(--muted)',
                              cursor: 'pointer', fontSize: 13, padding: '2px 4px',
                              borderRadius: 4, flexShrink: 0
                            }}
                            onMouseEnter={e => {
                              (e.target as HTMLElement).style.background = 'var(--coral-light)';
                              (e.target as HTMLElement).style.color = 'var(--coral)';
                            }}
                            onMouseLeave={e => {
                              (e.target as HTMLElement).style.background = 'none';
                              (e.target as HTMLElement).style.color = 'var(--muted)';
                            }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ORPHAN ENTRIES */}
      {(() => {
        const orphan = pyqData.filter((p) =>
          p.key && !subjects.some((s) => p.key.startsWith(s.name + '::'))
        );
        if (!orphan.length) return null;
        return (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8 }}>Other</div>
            {orphan.map((chap) => (
              <div key={chap.key} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                {chap.key} — {chap.sessions.length} session(s)
              </div>
            ))}
          </div>
        );
      })()}

      {/* ADD SESSION MODAL */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="📂 Log PYQ Session">
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Sessions accumulate — set number increases when you complete all questions.
        </p>
        <FormGroup label="Subject">
          <select className="form-input" value={selSubject}
            onChange={e => { setSelSubject(e.target.value); setSelChapter(''); }}>
            {subjects.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Chapter">
          <select className="form-input" value={selChapter} onChange={e => setSelChapter(e.target.value)}>
            {chaptersForSubject.length === 0
              ? <option value="">No chapters — add in Subject Progress first</option>
              : chaptersForSubject.map((c) => <option key={c.name}>{c.name}</option>)
            }
          </select>
        </FormGroup>
        <FormGroup label="Total questions in this chapter">
          <input className="form-input" type="number" placeholder="e.g. 80"
            value={total} onChange={e => setTotal(e.target.value)} />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label="Attempted">
            <input className="form-input" type="number" placeholder="e.g. 30"
              value={attempted} onChange={e => setAttempted(e.target.value)} />
          </FormGroup>
          <FormGroup label="Correct">
            <input className="form-input" type="number" placeholder="e.g. 20"
              value={correct} onChange={e => setCorrect(e.target.value)} />
          </FormGroup>
        </div>
        <ModalActions>
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Add session</button>
        </ModalActions>
      </Modal>
    </>
  );
}