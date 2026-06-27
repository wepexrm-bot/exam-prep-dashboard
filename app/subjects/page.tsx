'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Book, Check, Pencil, Trash2, ChevronDown, Target, Layers, Gauge } from 'lucide-react';
import { Empty, Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { SUB_COLORS } from '@/lib/constants';
import { getPct } from '@/lib/utils';

export default function SubjectsPage() {
  const { data, addSubject, deleteSubject, addChapter, toggleChapter, deleteChapter, renameChapter } = useApp();
  const [showAddSubj, setShowAddSubj] = useState(false);
  const [showAddCh, setShowAddCh] = useState<number | null>(null);
  const [newSubjName, setNewSubjName] = useState('');
  const [newChName, setNewChName] = useState('');
  const [openSubj, setOpenSubj] = useState<Record<number, boolean>>({});

  const subjects = data.subjects || [];
  const avg = subjects.length ? Math.round(subjects.reduce((a, s) => a + getPct(s), 0) / subjects.length) : 0;
  const totalCh = subjects.reduce((a, s) => a + (s.chapters || []).length, 0);
  const doneCh = subjects.reduce((a, s) => a + (s.chapters || []).filter(c => c.done).length, 0);
  const strong = subjects.filter(s => getPct(s) >= 80).length;
  const weak = subjects.filter(s => getPct(s) < 30).length;

  async function handleAddSubject() {
    const name = newSubjName.trim();
    if (!name) return showToast('Enter a subject name');
    if (subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) return showToast('Subject already exists');
    await addSubject(name);
    showToast(`"${name}" added`);
    setNewSubjName('');
    setShowAddSubj(false);
  }

  async function handleAddChapter() {
    if (showAddCh === null) return;
    const name = newChName.trim();
    if (!name) return showToast('Enter a chapter name');
    await addChapter(showAddCh, name);
    showToast('Chapter added ');
    setNewChName('');
    setShowAddCh(null);
  }

  async function handleRenameCh(si: number, ci: number) {
    const oldName = subjects[si].chapters[ci].name;
    const newName = prompt('Rename chapter:', oldName);
    if (!newName || newName.trim() === oldName) return;
    await renameChapter(si, ci, newName.trim());
    showToast('Chapter renamed ');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 12 }}>
      <style>{`
        @keyframes subjFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chRowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Subject Progress</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            Tick chapters to auto-update completion %
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddSubj(true)} style={{ flexShrink: 0, fontSize: 12 }}>
          <Plus size={14} /> Add subject
        </button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
      }}>
        {[
          { label: 'Overall Avg', value: `${avg}%`, icon: <Gauge size={14} />, color: '#22D3EE' },
          { label: 'Chapters Done', value: `${doneCh}/${totalCh}`, icon: <Layers size={14} />, color: '#4ADE80' },
          { label: 'Strong (≥80%)', value: String(strong), icon: <Check size={14} />, color: strong > 0 ? '#4ADE80' : 'var(--muted)' },
          { label: 'Needs Work', value: String(weak), icon: <Target size={14} />, color: weak > 0 ? '#F87171' : '#4ADE80' },
        ].map((m, i) => (
          <div key={i} className="stat-card" style={{ gap: 6 }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, display: 'inline-flex', color: m.color }}>{m.icon}</span>
              {m.label}
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'rgba(34,211,238,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22D3EE',
            }}>
              <Book size={22} strokeWidth={1.5} />
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>No subjects yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
            Add your first subject to start tracking chapter completion
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddSubj(true)}>
            <Plus size={14} /> Add your first subject
          </button>
        </div>
      )}

      {subjects.map((subj, si) => {
        const pct = getPct(subj);
        const isOpen = openSubj[si];
        const color = SUB_COLORS[si % SUB_COLORS.length];
        const doneC = (subj.chapters || []).filter(c => c.done).length;
        const totalC = (subj.chapters || []).length;
        const statusText = pct >= 80 ? 'Strong' : pct >= 50 ? 'In progress' : 'Needs work';
        const statusColor = pct >= 80 ? '#4ADE80' : pct >= 50 ? '#FB923C' : '#F87171';
        const glowColor = pct >= 80 ? 'rgba(74,222,128,0.35)' : 'rgba(251,146,60,0.3)';

        return (
          <div key={si} className="panel" style={{
            padding: 0, overflow: 'hidden',
            animation: `subjFadeIn 0.35s ease ${si * 0.06}s both`,
          }}>
            <div style={{
              height: 3, width: '100%',
              background: `linear-gradient(90deg, ${color}, ${color}66)`,
              boxShadow: `0 0 12px ${color}66`,
            }} />

            <div style={{ padding: '14px 16px' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                cursor: 'pointer', userSelect: 'none', gap: 8, flexWrap: 'wrap',
              }} onClick={() => setOpenSubj(prev => ({ ...prev, [si]: !prev[si] }))}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 140px' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    {subj.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right', minWidth: 30 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct}<span style={{ fontSize: 9, fontWeight: 500, color: 'var(--muted)' }}>%</span></span>
                  </div>
                  <div style={{ width: 56, height: 5, borderRadius: 99, background: 'var(--surface2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                      boxShadow: `0 0 8px ${glowColor}`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm(`Delete "${subj.name}"? Also removes chapters and PYQ data.`)) deleteSubject(si); }}
                    style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', color: '#555',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'none'; }}
                  >
                    <Trash2 size={11} />
                  </button>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--muted)', flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.25s ease',
                    background: 'rgba(255,255,255,0.04)',
                  }}>
                    <ChevronDown size={13} />
                  </div>
                </div>
              </div>

              {totalC > 0 && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 auto' }}>
                    <Layers size={11} />
                    {doneC}/{totalC} chapters
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                    background: statusColor + '1A', color: statusColor, whiteSpace: 'nowrap',
                    border: `1px solid ${statusColor}33`, flexShrink: 0,
                  }}>
                    {statusText}
                  </span>
                </div>
              )}

              {isOpen && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                      Chapters
                    </span>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 11, padding: '5px 12px', gap: 5 }}
                      onClick={() => { setShowAddCh(si); setNewChName(''); }}
                    >
                      <Plus size={11} /> Add chapter
                    </button>
                  </div>

                  {subj.chapters.length === 0 && <Empty>No chapters yet — add your first one</Empty>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {subj.chapters.map((ch, ci) => (
                      <div key={ci} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 12,
                        cursor: 'pointer', transition: 'all 0.15s',
                        animation: `chRowIn 0.25s ease ${ci * 0.03}s both`,
                      }}
                        className="group"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div
                          onClick={() => toggleChapter(si, ci)}
                          style={{
                            width: 20, height: 20, borderRadius: 7, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: ch.done ? '#4ADE80' : 'transparent',
                            border: ch.done ? 'none' : '1.5px solid var(--border)',
                            boxShadow: ch.done ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
                          }}
                        >
                          {ch.done && <Check size={10} strokeWidth={3} style={{ color: '#0F172A' }} />}
                        </div>

                        <span
                          onClick={() => toggleChapter(si, ci)}
                          style={{
                            flex: 1, fontSize: 13, minWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: ch.done ? 'var(--muted)' : '#fff',
                            textDecoration: ch.done ? 'line-through' : 'none',
                          }}
                        >
                          {ch.name}
                        </span>

                        <div style={{ display: 'flex', gap: 3 }}>
                          <button
                            onClick={() => handleRenameCh(si, ci)}
                            style={{
                              background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
                              cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                              padding: '3px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
                          >
                            <Pencil size={10} /> Rename
                          </button>
                          <button
                            onClick={() => { if (confirm('Remove chapter?')) deleteChapter(si, ci); }}
                            style={{
                              background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
                              cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                              padding: '3px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; e.currentTarget.style.color = '#F87171'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <Modal open={showAddSubj} onClose={() => setShowAddSubj(false)} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Book size={16} /> Add Subject</span>}>
        <FormGroup label="Subject name">
          <input className="form-input" type="text" placeholder="e.g. Operating Systems" value={newSubjName}
            onChange={e => setNewSubjName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()} />
        </FormGroup>
        <ModalActions>
          <button className="btn" onClick={() => setShowAddSubj(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddSubject}>Add subject</button>
        </ModalActions>
      </Modal>

      <Modal open={showAddCh !== null} onClose={() => setShowAddCh(null)}
        title={showAddCh !== null ? `Add chapter to ${subjects[showAddCh]?.name}` : 'Add chapter'}>
        <FormGroup label="Chapter name">
          <input className="form-input" type="text" placeholder="e.g. Process Synchronization" value={newChName}
            onChange={e => setNewChName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddChapter()} />
        </FormGroup>
        <ModalActions>
          <button className="btn" onClick={() => setShowAddCh(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddChapter}>Add chapter</button>
        </ModalActions>
      </Modal>
    </div>
  );
}
