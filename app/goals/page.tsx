'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, Empty, Modal, ModalActions, FormGroup, showToast } from '@/components/ui';
import { EXAM_CONFIG } from '@/lib/constants';

export default function GoalsPage() {
  const { data, toggleGoal, addGoal, deleteGoal, clearDoneGoals, examType } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [text, setText] = useState('');
  const [tag, setTag] = useState('');

  const goalTags = EXAM_CONFIG[examType].goalTags as readonly string[];
  const cfg = EXAM_CONFIG[examType];
  const goals = data.goals || [];
  const done = goals.filter(g => g.done).length;

  const byTag = goalTags.reduce<Record<string, typeof goals>>((acc, t) => {
    const items = goals.filter(g => g.tag === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});
  const untagged = goals.filter(g => !goalTags.includes(g.tag));

  async function handleAdd() {
    if (!text.trim()) return showToast('Enter a task name');
    await addGoal({ text: text.trim(), tag: tag || goalTags[0], done: false });
    showToast('Goal added!');
    setText('');
    setShowModal(false);
  }

  return (
    <>
      <PageHeader title="Daily Goals" sub={`${done}/${goals.length} completed today`}>
        {done > 0 && <button className="btn" onClick={clearDoneGoals}>Clear done</button>}
        <button className="btn btn-primary" onClick={() => { setTag(goalTags[0]); setShowModal(true); }}>+ Add goal</button>
      </PageHeader>

      {goals.length === 0 && (
        <Card className="text-center py-10">
          <div className="text-4xl mb-3">✅</div>
          <div className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text)' }}>No goals yet</div>
          <div className="text-[13px] mb-5" style={{ color: 'var(--muted)' }}>Add tasks to stay on track today</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add your first goal</button>
        </Card>
      )}

      {[...Object.entries(byTag), ...(untagged.length ? [['Other', untagged] as [string, typeof goals]] : [])].map(([tag, tagGoals]) => (
        <Card key={tag} className="mb-3">
          <CardHeader title={tag} />
          <div className="flex flex-col gap-1.5">
            {tagGoals.map(g => (
              <div key={g.id} className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-btn border group"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div onClick={() => toggleGoal(g.id)}
                  className="w-4.5 h-4.5 rounded flex-shrink-0 flex items-center justify-center text-[10px] text-white cursor-pointer"
                  style={g.done
                    ? { background: cfg.color }
                    : { border: '1.5px solid var(--border)' }}>
                  {g.done ? '✓' : ''}
                </div>
                <span onClick={() => toggleGoal(g.id)}
                  className={`flex-1 text-[13px] cursor-pointer ${g.done ? 'line-through' : ''}`}
                  style={g.done ? { color: 'var(--muted)' } : { color: 'var(--text)' }}>
                  {g.text}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: cfg.colorLight, color: cfg.color }}>{g.tag}</span>
                <button onClick={() => deleteGoal(g.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded transition-all"
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="✅ Add Goal">
        <FormGroup label="Task">
          <input className="form-input" type="text" placeholder="e.g. Solve 20 questions"
            value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        </FormGroup>
        <FormGroup label="Category">
          <select className="form-input" value={tag} onChange={e => setTag(e.target.value)}>
            {goalTags.map(t => <option key={t}>{t}</option>)}
          </select>
        </FormGroup>
        <ModalActions>
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add goal</button>
        </ModalActions>
      </Modal>
    </>
  );
}
