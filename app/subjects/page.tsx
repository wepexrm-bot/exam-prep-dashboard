'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Book, Check, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { PageHeader, Card, MetricCard, Empty, Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
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
    <>
      <PageHeader title="Subject Progress" sub="Tick chapters to auto-update completion %">
        <button className="btn btn-primary" onClick={() => setShowAddSubj(true)}><Plus size={14} /> Add subject</button>
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <MetricCard label="Overall avg" value={<>{avg}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} />
        <MetricCard label="Chapters done" value={<>{doneCh}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>/{totalCh}</sup></>} />
        <MetricCard label="Strong (≥80%)" value={<span style={{ color: 'var(--success)' }}>{strong}</span>} />
        <MetricCard label="Needs work" value={<span style={{ color: weak > 0 ? 'var(--danger)' : 'var(--success)' }}>{weak}</span>} />
      </div>

      {subjects.length === 0 && (
        <Card className="text-center py-10">
          <div className="flex justify-center mb-3"><Book size={40} strokeWidth={1.5} style={{ color: 'var(--muted)' }} /></div>
          <div className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text)' }}>No subjects yet</div>
          <div className="text-[13px] mb-5" style={{ color: 'var(--muted)' }}>Add your GATE subjects to start tracking chapter completion</div>
          <button className="btn btn-primary" onClick={() => setShowAddSubj(true)}><Plus size={14} /> Add your first subject</button>
        </Card>
      )}

      {subjects.map((subj, si) => {
        const pct = getPct(subj);
        const isOpen = openSubj[si];
        const color = SUB_COLORS[si % SUB_COLORS.length];
        const doneC = (subj.chapters || []).filter(c => c.done).length;
        const statusBadge = pct >= 80
          ? <span className="badge badge-green">Strong</span>
          : pct >= 50
          ? <span className="badge badge-amber">In progress</span>
          : <span className="badge badge-red">Needs work</span>;

        return (
          <Card key={si} className="mb-2.5">
            {/* Subject header */}
            <div className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setOpenSubj(prev => ({ ...prev, [si]: !prev[si] }))}>
              <span className="font-medium text-[14px]" style={{ color: 'var(--text)' }}>{subj.name}</span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {statusBadge}
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="text-xs font-semibold w-9 text-right" style={{ color }}>{pct}%</span>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Delete "${subj.name}"? Also removes chapters and PYQ data.`)) deleteSubject(si); }}
                  className="text-[11px] px-2 py-0.5 rounded-sm border transition-all flex items-center gap-1"
                  style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Trash2 size={11} /> Delete
                </button>
                <span className="text-xs transition-transform duration-200 inline-block" style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}><ChevronDown size={14} /></span>
              </div>
            </div>

            {/* Chapter body */}
            {isOpen && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                    Chapters ({doneC}/{subj.chapters.length} done)
                  </span>
                          <button className="btn btn-sm btn-primary" onClick={() => { setShowAddCh(si); setNewChName(''); }}><Plus size={12} /> Add chapter</button>
                </div>
                {subj.chapters.length === 0 && <Empty>No chapters yet — add your first one above</Empty>}
                <div className="flex flex-col gap-0.5">
                  {subj.chapters.map((ch, ci) => (
                    <div key={ci}
                      className="flex items-center gap-2.5 px-1 py-1.5 rounded-btn cursor-pointer group hover:bg-[var(--surface2)] transition-colors">
                      <div
                        onClick={() => toggleChapter(si, ci)}
                        className="w-4.5 h-4.5 rounded flex-shrink-0 flex items-center justify-center text-[10px] text-white transition-all cursor-pointer"
                        style={{ border: ch.done ? 'none' : '1.5px solid var(--border)', background: ch.done ? '#16A34A' : 'transparent' }}>
                        {ch.done && <Check size={10} strokeWidth={3} style={{ color: '#0F172A' }} />}
                      </div>
                      <span
                        onClick={() => toggleChapter(si, ci)}
                        className="flex-1 text-[13px]"
                        style={ch.done ? { textDecoration: 'line-through', color: 'var(--muted)' } : { color: 'var(--text)' }}>
                        {ch.name}
                      </span>
                      <button
                        onClick={() => handleRenameCh(si, ci)}
                        className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 rounded border transition-all flex items-center gap-1"
                        style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Pencil size={10} /> Rename
                      </button>
                      <button
                        onClick={() => { if (confirm('Remove chapter?')) deleteChapter(si, ci); }}
                        className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 rounded border transition-all flex items-center gap-1"
                        style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Add Subject Modal */}
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

      {/* Add Chapter Modal */}
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
    </>
  );
}
