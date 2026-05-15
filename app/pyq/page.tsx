'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, MetricCard, Empty, Modal, ModalActions, FormGroup, showToast } from '@/components/ui';

function today() { return new Date().toISOString().split('T')[0]; }

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
  const pyqData = data.pyqData || [];

  const totalChapters = pyqData.length;
  const completedSets = pyqData.filter(d => {
    if (!d.sessions?.length) return false;
    return d.sessions.reduce((a, s) => a + s.attempted, 0) >= d.total;
  }).length;
  const allSessions = pyqData.reduce((a, d) => a + (d.sessions?.length || 0), 0);
  const allAcc = pyqData.flatMap(d =>
    (d.sessions || []).map(s => s.accuracy)
  );
  const avgAcc = allAcc.length ? Math.round(allAcc.reduce((a, v) => a + v, 0) / allAcc.length) : 0;

  const chaptersForSubject = selSubject
    ? (subjects.find(s => s.name === selSubject)?.chapters || [])
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
    const key = `${selSubject}::${chapter}`;
    await addPYQSession(key, Number(total), { attempted: Number(attempted), correct: Number(correct), accuracy: acc, date: today() });
    showToast(`Session added to ${chapter}!`);
    setShowModal(false);
  }

  return (
    <>
      <PageHeader title="PYQ Tracker" sub="Previous Year Question sets, chapter-wise">
        <button className="btn btn-primary" onClick={openModal}>+ Log session</button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <MetricCard label="Chapters tracked" value={totalChapters} />
        <MetricCard label="Sets completed" value={<span style={{ color: 'var(--success)' }}>{completedSets}</span>} />
        <MetricCard label="Total sessions" value={allSessions} />
        <MetricCard label="Avg accuracy" value={<>{avgAcc}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} />
      </div>

      {pyqData.length === 0 && (
        <Card className="text-center py-10">
          <div className="text-4xl mb-3">📂</div>
          <div className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text)' }}>No PYQ sessions yet</div>
          <div className="text-[13px] mb-5" style={{ color: 'var(--muted)' }}>Start logging chapter-wise PYQ sessions</div>
          <button className="btn btn-primary" onClick={openModal}>+ Log your first session</button>
        </Card>
      )}

      {/* Group by subject */}
      {subjects.map(subj => {
        const subjChaps = pyqData.filter(p => p.key && p.key.startsWith(subj.name + '::'));
        if (!subjChaps.length) return null;
        return (
          <Card key={subj.name} className="mb-3">
            <CardHeader title={subj.name} />
            <div className="flex flex-col gap-2">
              {subjChaps.map(chap => {
                const sessTotal = chap.sessions.reduce((a, s) => a + s.attempted, 0);
                const pct = chap.total > 0 ? Math.min(100, Math.round(sessTotal / chap.total * 100)) : 0;
                const chapName = chap.key.split('::')[1];
                const isOpen = openKey === chap.key;
                return (
                  <div key={chap.key} className="border rounded-btn overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none hover:bg-[var(--surface2)] transition-colors"
                      onClick={() => setOpenKey(isOpen ? null : chap.key)}>
                      <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--text)' }}>{chapName}</span>
                      <div className="w-24 h-1.5 rounded-full overflow-hidden hidden sm:block" style={{ background: 'var(--surface2)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? '#16A34A' : '#2563EB' }} />
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>{sessTotal}/{chap.total} Qs</span>
                      {pct >= 100 && <span className="badge badge-green">Done</span>}
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    {isOpen && (
                      <div className="border-t px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                        {chap.sessions.length === 0 && <Empty>No sessions logged</Empty>}
                        {chap.sessions.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 py-1.5 text-[12px]">
                            <span style={{ color: 'var(--muted)' }}>{s.date}</span>
                            <span style={{ color: 'var(--text)' }}>{s.attempted} attempted · {s.correct} correct</span>
                            <span className="font-semibold" style={{ color: '#2563EB' }}>{s.accuracy}% acc</span>
                            <button
                              onClick={() => deletePYQSession(chap.key, i)}
                              className="ml-auto text-[10px] px-1.5 rounded"
                              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* PYQ for subjects with no matching subject entry */}
      {(() => {
        const orphan = pyqData.filter(p => p.key && !subjects.some(s => p.key.startsWith(s.name + '::')));
        if (!orphan.length) return null;
        return (
          <Card className="mb-3">
            <CardHeader title="Other" />
            {orphan.map(chap => (
              <div key={chap.key} className="text-[13px] py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                {chap.key} — {chap.sessions.length} session(s)
              </div>
            ))}
          </Card>
        );
      })()}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="📂 Log PYQ Session">
        <FormGroup label="Subject">
          <select className="form-input" value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelChapter(''); }}>
            {subjects.map(s => <option key={s.name}>{s.name}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Chapter">
          <select className="form-input" value={selChapter} onChange={e => setSelChapter(e.target.value)}>
            {chaptersForSubject.length === 0
              ? <option value="">No chapters — add in Subject Progress first</option>
              : chaptersForSubject.map(c => <option key={c.name}>{c.name}</option>)
            }
          </select>
        </FormGroup>
        <FormGroup label="Total Qs in chapter">
          <input className="form-input" type="number" placeholder="e.g. 40" value={total} onChange={e => setTotal(e.target.value)} />
        </FormGroup>
        <FormGroup label="Attempted this session">
          <input className="form-input" type="number" placeholder="e.g. 20" value={attempted} onChange={e => setAttempted(e.target.value)} />
        </FormGroup>
        <FormGroup label="Correct">
          <input className="form-input" type="number" placeholder="e.g. 14" value={correct} onChange={e => setCorrect(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save session</button>
        </ModalActions>
      </Modal>
    </>
  );
}