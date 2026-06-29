'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { badgeById } from '@/lib/badges';
import { Award } from 'lucide-react';

const shownBadgeIds = new Set<string>();

export function BadgeNotification() {
  const { newBadges, clearNewBadges } = useApp();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<{ id: string; name: string; icon: string } | null>(null);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    if (newBadges.length > 0) {
      for (const b of newBadges) {
        if (!shownBadgeIds.has(b.badgeId) && !queueRef.current.includes(b.badgeId)) {
          queueRef.current.push(b.badgeId);
        }
      }
      clearNewBadges();
    }

    if (!visible && queueRef.current.length > 0) {
      const nextId = queueRef.current.shift()!;
      shownBadgeIds.add(nextId);
      const def = badgeById(nextId);
      if (def) {
        setCurrent({ id: def.id, name: def.name, icon: def.icon });
        setVisible(true);
      }
    }
  }, [newBadges, visible, clearNewBadges]);

  useEffect(() => {
    if (!visible || !current) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setCurrent(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [visible, current]);

  const handleClick = useCallback(() => {
    setVisible(false);
    setCurrent(null);
    router.push('/badges');
  }, [router]);

  if (!visible || !current) return null;

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 80, right: 16, zIndex: 300,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 14,
        background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(34,211,238,0.35)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        animation: 'badgeIn 0.35s ease-out',
        maxWidth: 300,
      }}
        onClick={handleClick}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(251,146,60,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Award size={18} style={{ color: '#FBBF24' }} />
        </div>
        <img src={current.icon} alt={current.name}
          style={{ width: 30, height: 30, borderRadius: 7 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22D3EE' }}>Badge Unlocked!</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1 }}>{current.name}</div>
        </div>
      </div>
      <style>{`
        @keyframes badgeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
