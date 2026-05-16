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
      <div className="page-header">
        <div>
          <div className="page-title">PYQ Tracker</div>
          <div className="page-sub">Chapter-wise sessions · progress auto-accumulates across sessions</div>
        </div>
        <button className="btn btn-primary" onClick={openModal}>+ Add session</button>
      </div>

      {/* INFO BANNER */}
      <div style={{
        background: 'var(--surface2)', borderRadius: 'var(--radius-sm)',
        padding: '10px 14px', fontSize: '12px', color: 'var(--muted)',
        marginBottom: '14px', lineHeight: 1.7
      }}>
        📌 Progress shows <strong>total solved / total questions</strong> across all sessions.
        Accuracy is weighted across all sessions combined. Set number increments each time you complete all questions.
      </div>

      {/* SUMMARY METRICS */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <div className="metric">
          <div className="metric-lbl">Total sessions</div>
          <div className="metric-val">{totalSessions}</div>
        </div>
        <div className="metric">
          <div className="metric-lbl">Chapters complete</div>
          <div className="metric-val" style={{ color: 'var(--green)' }}>{chaptersComplete}</div>
        </div>
        <div className="metric">
          <div className="metric-lbl">Total solved</div>
          <div className="metric-val">{totalSolved}<sup>/{totalQs}</sup></div>
        </div>
        <div className="metric">
          <div className="metric-lbl">Overall accuracy</div>
          <div className="metric-val" style={{ color: accColor(overallAcc) }}>{overallAcc}%</div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {pyqData.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 6 }}>No PYQ sessions yet</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '1.25rem' }}>
            Start logging chapter-wise PYQ sessions to track your progress
          </div>
          <button className="btn btn-primary" onClick={openModal}>+ Log your first session</button>
        </div>
      )}

      {/* SUBJECT GROUPS */}
      {subjects.map((subj) => {
        const subjChaps = pyqData.filter((p) => p.key?.startsWith(subj.name + '::'));
        if (!subjChaps.length) return null;

        const subjStats = subjChaps.map((c) => getStats(c)).filter(Boolean) as NonNullable<ReturnType<typeof getStats>>[];
        const subjAtt = subjStats.reduce((a, s) => a + s.att, 0);
        const subjCor = subjStats.reduce((a, s) => a + s.cor, 0);
        const subjAcc = subjAtt > 0 ? Math.round((subjCor / subjAtt) * 100) : 0;

        return (
          <div key={subj.name} className="section-full" style={{ marginBottom: '1.25rem' }}>

            {/* Subject header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 6, padding: '0 4px'
            }}>
              <span style={{
                fontSize: '13px', fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>{subj.name}</span>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 10px',
                borderRadius: '99px', background: accBg(subjAcc), color: accColor(subjAcc)
              }}>avg accuracy: {subjAcc}%</span>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '16px 1fr 200px 100px 100px 32px',
              gap: 8, padding: '0 12px 6px',
              fontSize: '10px', color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700
            }}>
              <span /><span>Chapter</span><span>Progress</span>
              <span>Accuracy</span><span>Set</span><span />
            </div>

            {/* Chapter rows */}
            {subjChaps.map((chap) => {
              const st = getStats(chap);
              if (!st) return null;
              const chapName = chap.key.split('::')[1];
              const isOpen = openKey === chap.key;
              const dotColor = st.isComplete ? 'var(--green)' : st.att > 0 ? 'var(--amber)' : 'var(--muted)';
              const barColor = st.isComplete ? '#16A34A' : st.pct >= 50 ? '#CA8A04' : '#2563EB';
              const setLabel = st.isComplete ? 'Set 1' : st.att > 0 ? 'In progress' : 'Not started';
              const setColor = st.isComplete ? 'var(--green)' : st.att > 0 ? 'var(--amber)' : 'var(--muted)';
              const setBg = st.isComplete ? 'var(--green-light)' : st.att > 0 ? 'var(--amber-light)' : 'var(--surface2)';

              return (
                <div key={chap.key} style={{ marginBottom: 6 }}>

                  {/* Chapter row */}
                  <div
                    className="card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '16px 1fr 200px 100px 100px 32px',
                      gap: 8, alignItems: 'center',
                      padding: '10px 12px', cursor: 'pointer', marginBottom: 0
                    }}
                    onClick={() => setOpenKey(isOpen ? null : chap.key)}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: dotColor, flexShrink: 0
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                      {chapName}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: barColor }}>{st.att}</span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}> / {chap.total}</span>
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                          {st.remaining > 0 ? `${st.remaining} left` : '✓ done'}
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface2)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${st.pct}%`, height: '100%', background: barColor,
                          borderRadius: '99px', transition: 'width 0.4s'
                        }} />
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '2px 9px',
                      borderRadius: '99px', display: 'inline-block',
                      background: st.att > 0 ? accBg(st.acc) : 'var(--surface2)',
                      color: st.att > 0 ? accColor(st.acc) : 'var(--muted)'
                    }}>{st.att > 0 ? `${st.acc}%` : '—'}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '2px 9px',
                      borderRadius: '99px', display: 'inline-block',
                      background: setBg, color: setColor
                    }}>{setLabel}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenKey(isOpen ? null : chap.key); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', color: 'var(--muted)', padding: '2px 4px'
                      }}
                      title="View sessions"
                    >📋</button>
                  </div>

                  {/* Session breakdown panel */}
                  {isOpen && (
                    <div style={{
                      background: 'var(--surface2)', borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px', marginTop: 4
                    }}>
                      {/* Breakdown header */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 4, marginBottom: 8,
                        fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        <span>Session breakdown ({chap.sessions.length} session{chap.sessions.length !== 1 ? 's' : ''})</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                          Total: {st.cor}/{st.att} correct = {st.acc}% overall
                        </span>
                      </div>

                      {/* Session column headers */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '80px 1fr 1fr 90px 24px',
                        gap: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)',
                        fontSize: '10px', color: 'var(--muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        <span>Session</span><span>Attempted</span>
                        <span>Correct</span><span>Accuracy</span><span />
                      </div>

                      {chap.sessions.length === 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '8px 0' }}>
                          No sessions logged
                        </div>
                      )}

                      {chap.sessions.map((s: PYQSession, i: number) => (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '80px 1fr 1fr 90px 24px',
                          gap: 8, alignItems: 'center', padding: '7px 0', fontSize: '12px',
                          borderBottom: i < chap.sessions.length - 1 ? '1px solid var(--border)' : 'none'
                        }}>
                          <span style={{ fontWeight: 500, color: 'var(--text)' }}>Session {i + 1}</span>
                          <span style={{ color: 'var(--muted)' }}>{s.attempted} questions</span>
                          <span style={{ color: 'var(--muted)' }}>{s.correct} correct</span>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                            borderRadius: '99px', display: 'inline-block',
                            background: accBg(s.accuracy), color: accColor(s.accuracy)
                          }}>{s.accuracy}%</span>
                          <button
                            onClick={() => deletePYQSession(chap.key, i)}
                            style={{
                              background: 'none', border: 'none', color: 'var(--muted)',
                              cursor: 'pointer', fontSize: '13px', padding: '2px 4px',
                              borderRadius: 4, transition: 'all 0.12s'
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
          <div className="card section-full">
            <div className="card-head"><span className="card-title">Other</span></div>
            {orphan.map((chap) => (
              <div key={chap.key} style={{
                fontSize: '13px', padding: '9px 0',
                borderBottom: '1px solid var(--border)', color: 'var(--text)'
              }}>
                {chap.key} — {chap.sessions.length} session(s)
              </div>
            ))}
          </div>
        );
      })()}

      {/* ADD SESSION MODAL */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="📂 Log PYQ Session">
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Adds to existing sessions for the same chapter. Sessions accumulate — set number increases when you complete all questions.
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
          <input className="form-input" type="number"
            placeholder="e.g. 80 (total across all sessions)"
            value={total} onChange={e => setTotal(e.target.value)} />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label="Attempted this session">
            <input className="form-input" type="number" placeholder="e.g. 30"
              value={attempted} onChange={e => setAttempted(e.target.value)} />
          </FormGroup>
          <FormGroup label="Correct this session">
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