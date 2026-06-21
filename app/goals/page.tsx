'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal, ModalActions, FormGroup, showToast, Empty } from '@/components/ui';
import { Goal } from '@/lib/types';
import { useExamConfig } from '@/lib/useExamConfig';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Flag, X, Calendar, Lock, Target, ClipboardList } from 'lucide-react';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayKey() { return dateKey(new Date()); }
function toKey(d: Date) { return dateKey(d); }

const TAG_COLORS: Record<string, { color: string; bg: string }> = {
  CS: { color: '#22D3EE', bg: 'rgba(34,211,238,0.15)' },
  Math: { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  CN: { color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
  Test: { color: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
  Revision: { color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
  PYQ: { color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
  Paper1: { color: '#22D3EE', bg: 'rgba(34,211,238,0.15)' },
  Paper2: { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  Reading: { color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
  Writing: { color: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
  Other: { color: '#9CA3AF', bg: 'rgba(255,255,255,0.08)' },
};

const I = {
  chevLeft: <ChevronLeft size={18} />,
  chevRight: <ChevronRight size={18} />,
  plus: <Plus size={14} />,
  check: <Check size={11} strokeWidth={3} style={{ color: '#0F172A' }} />,
  trash: <Trash2 size={13} />,
  flag: <Flag size={11} />,
  close: <X size={18} />,
  calendar: <Calendar size={16} />,
};

export default function GoalsCalendarPage() {
  const { data, addGoal, toggleGoal, deleteGoal, examType } = useApp();
  const goals: Goal[] = data.goals || [];
  const { config: cfg } = useExamConfig(examType);
  const goalTags = cfg.goalTags;
  const carryoverDone = useRef(false);

  // ── Auto-carryover: incomplete goals from past dates move to today ────
  useEffect(() => {
    if (carryoverDone.current || goals.length === 0) return;
    const today = todayKey();
    const existingTodayTexts = new Set(goals.filter(g => g.date === today).map(g => g.text));
    let carried = 0;
    goals.forEach(g => {
      if (g.done || g.date >= today || g.endDate) return;
      if (existingTodayTexts.has(g.text)) return;
      addGoal({ text: g.text, tag: g.tag, done: false, date: today });
      existingTodayTexts.add(g.text);
      carried++;
    });
    if (carried > 0) showToast(`${carried} goal${carried > 1 ? 's' : ''} carried over to today`);
    carryoverDone.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals.length]);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [poppedCell, setPoppedCell] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [goalTag, setGoalTag] = useState(goalTags[0]);
  const [isRanged, setIsRanged] = useState(false);
  const [endDate, setEndDate] = useState('');

  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayK = todayKey();

  const calendarCells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function goalsForDate(dateKey: string): Goal[] {
    return goals.filter(g => {
      const start = g.date;
      const end = g.endDate || g.date;
      return dateKey >= start && dateKey <= end;
    });
  }

  const monthActivity = useMemo(() => {
    const map: Record<number, { total: number; done: number; hasDeadline: boolean }> = {};
    calendarCells.forEach(day => {
      if (!day) return;
      const dKey = toKey(new Date(year, month, day));
      const dayGoals = goalsForDate(dKey);
      const hasDeadline = goals.some(g => g.endDate === dKey);
      if (dayGoals.length > 0 || hasDeadline) {
        map[day] = { total: dayGoals.length, done: dayGoals.filter(g => g.done).length, hasDeadline };
      }
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, year, month]);

  // ── Bottom sheet open/close animation handling ──────────────
  function openSheetForDate(dKey: string) {
    setSelectedDate(dKey);
    setPoppedCell(dKey);
    setTimeout(() => setPoppedCell(null), 280); // pop-bounce duration on the cell

    setSheetMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => { setSheetMounted(false); setSelectedDate(null); }, 320);
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && sheetMounted) closeSheet(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetMounted]);

  const selectedGoals = selectedDate ? goalsForDate(selectedDate) : [];
  const selectedDeadlines = selectedDate ? goals.filter(g => g.endDate === selectedDate && g.date !== selectedDate) : [];
  const selectedDoneCount = selectedGoals.filter(g => g.done).length;

  function prevMonth() {
    setViewMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  }
  function nextMonth() {
    setViewMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  }

  function openAddModal() {
    setGoalText(''); setGoalTag(goalTags[0]); setIsRanged(false); setEndDate('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!selectedDate) return;
    if (selectedDate < todayKey()) return showToast('Cannot add goals to a past date');
    if (!goalText.trim()) return showToast('Enter a goal description');
    if (isRanged && endDate && endDate < selectedDate) return showToast('End date must be after start date');
    await addGoal({
      text: goalText.trim(),
      tag: goalTag,
      done: false,
      date: selectedDate,
      endDate: isRanged && endDate ? endDate : undefined,
    });
    showToast('Goal added!');
    setShowModal(false);
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const isToday = selectedDate === todayK;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 12 }}>
      <style>{`
        @keyframes cellPop {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes sheetBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes goalRowIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Goal Calendar</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
          Tap any date to plan or review goals
        </p>
      </div>

      {/* CALENDAR */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={prevMonth} style={navArrowStyle}>{I.chevLeft}</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{monthLabel}</span>
          <button onClick={nextMonth} style={navArrowStyle}>{I.chevRight}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {calendarCells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dKey = toKey(new Date(year, month, day));
            const activity = monthActivity[day];
            const isSelected = dKey === selectedDate && sheetMounted;
            const isTodayCell = dKey === todayK;
            const allDone = activity && activity.total > 0 && activity.done === activity.total;
            const isPopping = poppedCell === dKey;

            return (
              <button
                key={i}
                onClick={() => openSheetForDate(dKey)}
                style={{
                  aspectRatio: '1', borderRadius: 10, border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  background: isSelected ? 'linear-gradient(135deg, #22D3EE, #3B82F6)'
                    : isTodayCell ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)',
                  boxShadow: isSelected ? '0 0 16px rgba(34,211,238,0.4)' : isTodayCell ? 'inset 0 0 0 1px rgba(34,211,238,0.3)' : 'none',
                  color: isSelected ? '#0F172A' : isTodayCell ? '#22D3EE' : '#E5E7EB',
                  fontWeight: isSelected || isTodayCell ? 700 : 500,
                  position: 'relative',
                  animation: isPopping ? 'cellPop 0.28s ease-out' : 'none',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              >
                <span style={{ fontSize: 12 }}>{day}</span>
                {activity && (
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {activity.total > 0 && (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#0F172A' : allDone ? '#4ADE80' : '#FB923C' }} />
                    )}
                    {activity.hasDeadline && (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#0F172A' : '#F87171' }} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 10, justifyContent: 'center', flexWrap: 'wrap', color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FB923C', display: 'inline-block' }} />Goals set</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />All done</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', display: 'inline-block' }} />Deadline</span>
        </div>
      </div>

      {/* Hint when nothing selected yet */}
      {!sheetMounted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14,
          background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', color: '#7C8089', fontSize: 12,
        }}>
          <span style={{ color: '#22D3EE' }}>{I.calendar}</span>
          Tap a date above to view or add goals for that day
        </div>
      )}

      {/* ── BOTTOM SHEET ── */}
      {sheetMounted && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeSheet}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
              opacity: sheetVisible ? 1 : 0,
              transition: 'opacity 0.32s ease',
            }}
          />

          {/* Sheet */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
            maxWidth: 480, margin: '0 auto',
            background: '#1C1F25',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            padding: '10px 18px calc(20px + env(safe-area-inset-bottom))',
            maxHeight: '78vh', overflowY: 'auto',
            transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Sheet header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
                  {selectedDateLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  {isToday && (
                    <span style={{
                    fontSize: 10, fontWeight: 700, color: '#22D3EE', background: 'rgba(34,211,238,0.12)',
                    padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(34,211,238,0.3)',
                    }}>Today</span>
                  )}
                  {selectedGoals.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedDoneCount}/{selectedGoals.length} done</span>
                  )}
                </div>
              </div>
              <button onClick={closeSheet} style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9CA3AF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{I.close}</button>
            </div>

            {/* Add goal button — disabled for past dates */}
            {selectedDate && selectedDate >= todayK ? (
              <button
                onClick={openAddModal}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0' }}
              >{I.plus} Add goal for this day</button>
            ) : selectedDate && selectedDate < todayK ? (
              <div style={{
                width: '100%', textAlign: 'center', padding: '10px 0', margin: '14px 0',
                fontSize: 12, color: 'var(--muted)',
                background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><Lock size={12} /> Past date — cannot add new goals</div>
            ) : null}

            {/* Goals list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {selectedGoals.length === 0 && selectedDeadlines.length === 0 && (
                <Empty>No goals for this date yet.</Empty>
              )}

              {selectedGoals.map((g, idx) => {
                const tc = TAG_COLORS[g.tag] || TAG_COLORS.Other;
                const isRange = g.endDate && g.endDate !== g.date;
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    opacity: g.done ? 0.55 : 1,
                    animation: `goalRowIn 0.3s ease ${idx * 0.04}s both`,
                  }}>
                    <button
                      onClick={() => toggleGoal(g.id)}
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: g.done ? '#4ADE80' : 'transparent',
                        border: g.done ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                        boxShadow: g.done ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >{g.done && I.check}</button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: '#E5E7EB', textDecoration: g.done ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{g.text}</div>
                      {isRange && (
                        <div style={{ fontSize: 10, color: '#F87171', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                          {I.flag} Due {new Date(g.endDate! + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 99, flexShrink: 0, background: tc.bg, color: tc.color }}>{g.tag}</span>

                    <button
                      onClick={() => deleteGoal(g.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, display: 'flex' }}
                    >{I.trash}</button>
                  </div>
                );
              })}

              {selectedDeadlines.map((g, idx) => {
                const tc = TAG_COLORS[g.tag] || TAG_COLORS.Other;
                return (
                  <div key={`deadline-${g.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12,
                    background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
                    animation: `goalRowIn 0.3s ease ${(selectedGoals.length + idx) * 0.04}s both`,
                  }}>
                    <span style={{ color: '#F87171', flexShrink: 0 }}>{I.flag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#E5E7EB' }}>{g.text}</div>
                      <div style={{ fontSize: 10, color: '#F87171', marginTop: 2 }}>
                        Started {new Date(g.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · Due today
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 99, flexShrink: 0, background: tc.bg, color: tc.color }}>{g.tag}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ADD GOAL MODAL */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Target size={16} /> {selectedDate ? `Goal for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Add Goal'}</span>}>
        <FormGroup label="What's the goal?">
          <input className="form-input" placeholder="e.g. Finish Discrete Maths chapter 3"
            value={goalText} onChange={e => setGoalText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
        </FormGroup>

        <FormGroup label="Category">
          <select className="form-input" value={goalTag} onChange={e => setGoalTag(e.target.value as typeof goalTag)}>
            {goalTags.map(t => <option key={t}>{t}</option>)}
          </select>
        </FormGroup>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }} onClick={() => setIsRanged(!isRanged)}>
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isRanged ? '#22D3EE' : 'transparent',
            border: isRanged ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
          }}>{isRanged && <Check size={11} strokeWidth={3} style={{ color: '#0F172A' }} />}</div>
          <span style={{ fontSize: 12, color: '#E5E7EB' }}>This goal has a deadline (multi-day target)</span>
        </div>

        {isRanged && (
          <FormGroup label="Target completion date" hint={selectedDate ? `starts ${selectedDate}` : ''}>
            <input className="form-input" type="date" min={selectedDate || undefined}
              value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormGroup>
        )}

        <ModalActions>
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Add goal</button>
        </ModalActions>
      </Modal>
    </div>
  );
}

const navArrowStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#9CA3AF', cursor: 'pointer',
};