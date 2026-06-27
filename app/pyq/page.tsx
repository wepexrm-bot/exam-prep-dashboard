'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { PYQChapter, PYQSession } from '@/lib/types';
import { Plus, Folder, FolderOpen, Trash2, ChevronDown } from 'lucide-react';

function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function accColor(a: number) {
  return a >= 75 ? '#4ADE80' : a >= 50 ? '#FB923C' : '#F87171';
}
function accBg(a: number) {
  return a >= 75 ? 'rgba(74,222,128,0.15)' : a >= 50 ? 'rgba(251,146,60,0.15)' : 'rgba(248,113,113,0.15)';
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
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const subjects = data.subjects || [];
  const pyqData: PYQChapter[] = data.pyqData || [];

  const allStats = pyqData.map(d => getStats(d)).filter((s): s is NonNullable<ReturnType<typeof getStats>> => s !== null);
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
    if (!correct) return showToast('Enter questions correct this session');
    const nTotal = Number(total);
    const nAttempted = Number(attempted);
    const nCorrect = Number(correct);
    if (nTotal <= 0) return showToast('Total questions must be greater than 0');
    if (nAttempted < 0) return showToast('Attempted cannot be negative');
    if (nCorrect < 0) return showToast('Correct cannot be negative');
    if (nCorrect > nAttempted) return showToast('Correct cannot exceed attempted');
    if (nAttempted > nTotal) return showToast('Attempted cannot exceed total questions');
    const acc = nAttempted > 0 ? Math.round((nCorrect / nAttempted) * 100) : 0;
    await addPYQSession(`${selSubject}::${chapter}`, nTotal, {
      attempted: nAttempted, correct: nCorrect, accuracy: acc, date: today()
    });
    showToast(`Session added to ${chapter}!`);
    setShowModal(false);
  }

  function toggleSubjectExpand(name: string) {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const subjectGroups = subjects
    .map(subj => {
      const subjChaps = pyqData.filter((p) => p.key?.startsWith(subj.name + '::') && p.sessions?.length > 0);
      if (!subjChaps.length) return null;
      const subjStats = subjChaps.map((c) => getStats(c)).filter(Boolean) as NonNullable<ReturnType<typeof getStats>>[];
      const subjAtt = subjStats.reduce((a, s) => a + s.att, 0);
      const subjCor = subjStats.reduce((a, s) => a + s.cor, 0);
      const subjAcc = subjAtt > 0 ? Math.round((subjCor / subjAtt) * 100) : 0;
      const subjTotal = subjChaps.reduce((a, c) => a + (c.total || 0), 0);
      const subjSessions = subjChaps.reduce((a, c) => a + c.sessions.length, 0);
      return { subj, subjChaps, subjAcc, subjAtt, subjTotal, subjSessions };
    })
    .filter(Boolean) as { subj: any; subjChaps: PYQChapter[]; subjAcc: number; subjAtt: number; subjTotal: number; subjSessions: number }[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 12 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>PYQ Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            Grouped by subject · progress auto-accumulates across sessions
          </p>
        </div>
        <button className="btn btn-primary" onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add session
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[
          { label: 'Total sessions', value: totalSessions, color: '#fff' },
          { label: 'Chapters complete', value: chaptersComplete, color: '#4ADE80' },
          { label: 'Total solved', value: <>{totalSolved}<sup style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>/{totalQs}</sup></>, color: '#fff' },
          { label: 'Overall accuracy', value: `${overallAcc}%`, color: accColor(overallAcc) },
        ].map(m => (
          <div key={m.label} className="stat-card">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {subjectGroups.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><FolderOpen size={40} strokeWidth={1.5} style={{ color: '#3B4250' }} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>No PYQ sessions yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Start logging chapter-wise PYQ sessions</div>
          <button className="btn btn-primary" onClick={openModal}>+ Log your first session</button>
        </div>
      )}

      {subjectGroups.map(({ subj, subjChaps, subjAcc, subjAtt, subjTotal, subjSessions }) => {
        const isCollapsed = !expandedSubjects.has(subj.name);
        return (
          <div key={subj.name} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              onClick={() => toggleSubjectExpand(subj.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer',
                borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: 'rgba(34,211,238,0.12)', color: '#22D3EE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Folder size={14} /></div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{subj.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                  {subjChaps.length} chapter{subjChaps.length !== 1 ? 's' : ''} · {subjSessions} session{subjSessions !== 1 ? 's' : ''} · {subjAtt}/{subjTotal} solved
                </div>
              </div>

              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, flexShrink: 0,
                background: accBg(subjAcc), color: accColor(subjAcc),
              }}>{subjAcc}% acc</span>

              <span style={{ color: '#7C8089', flexShrink: 0 }}><ChevronDown size={16} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} /></span>
            </div>

            {!isCollapsed && (
              <div style={{ padding: '8px 12px 12px' }}>
                {subjChaps.map((chap) => {
                  const st = getStats(chap);
                  if (!st) return null;
                  const chapName = chap.key.split('::')[1];
                  const isOpen = openKey === chap.key;
                  const barColor = st.isComplete ? '#4ADE80' : st.pct >= 50 ? '#FB923C' : '#22D3EE';
                  const dotColor = st.isComplete ? '#4ADE80' : st.att > 0 ? '#FB923C' : 'var(--muted)';
                  const setLabel = st.isComplete ? 'Complete' : 'In progress';
                  const setColor = st.isComplete ? '#4ADE80' : '#FB923C';
                  const setBg = st.isComplete ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)';

                  return (
                    <div key={chap.key} style={{ marginBottom: 6 }}>
                      <div
                        onClick={() => setOpenKey(isOpen ? null : chap.key)}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: st.isComplete ? '0 0 6px #4ADE80' : 'none' }} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#E5E7EB', minWidth: 0, wordBreak: 'break-word' }}>{chapName}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: setBg, color: setColor, flexShrink: 0 }}>{setLabel}</span>
                        </div>

                        <div style={{ marginBottom: st.att > 0 ? 6 : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: barColor }}>{st.att} / {chap.total}</span>
                            <span style={{ color: 'var(--muted)' }}>{st.remaining > 0 ? `${st.remaining} left` : '✓ done'}</span>
                          </div>
                          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${st.pct}%`, borderRadius: 99, transition: 'width 0.4s',
                              background: barColor, boxShadow: `0 0 8px ${barColor}66`,
                            }} />
                          </div>
                        </div>

                        {st.att > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Accuracy:</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: accBg(st.acc), color: accColor(st.acc) }}>{st.acc}%</span>
                          </div>
                        )}
                      </div>

                      {isOpen && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {chap.sessions.length} session{chap.sessions.length !== 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#E5E7EB' }}>{st.cor}/{st.att} correct = {st.acc}%</span>
                          </div>
                          {chap.sessions.map((s: PYQSession, i: number) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', flexWrap: 'wrap',
                              borderBottom: i < chap.sessions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#E5E7EB', minWidth: 56 }}>#{i + 1}</span>
                              <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}>{s.attempted} attempted · {s.correct} correct</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: accBg(s.accuracy), color: accColor(s.accuracy), flexShrink: 0 }}>{s.accuracy}%</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (confirm('Delete this session?')) deletePYQSession(chap.key, i); }}
                                style={{
                                  background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                                  padding: '2px 4px', borderRadius: 4, flexShrink: 0, display: 'flex',
                                }}
                              ><Trash2 size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FolderOpen size={16} /> Log PYQ Session</span>}>
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
          <input className="form-input" type="number" min="1" placeholder="e.g. 80"
            value={total} onChange={e => setTotal(e.target.value)} />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormGroup label="Attempted">
            <input className="form-input" type="number" min="0" placeholder="e.g. 30"
              value={attempted} onChange={e => setAttempted(e.target.value)} />
          </FormGroup>
          <FormGroup label="Correct">
            <input className="form-input" type="number" min="0" placeholder="e.g. 20"
              value={correct} onChange={e => setCorrect(e.target.value)} />
          </FormGroup>
        </div>
        <ModalActions>
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Add session</button>
        </ModalActions>
      </Modal>
    </div>
  );
}