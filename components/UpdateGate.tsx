'use client';
import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { isVersionLower } from '@/lib/version';

export default function UpdateGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ blocked: boolean; soft: boolean; apkUrl?: string; notes?: string }>({ blocked: false, soft: false });
  const browserRef = useRef<any>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    (async () => {
      try {
        const [{ App }, { Browser }] = await Promise.all([import('@capacitor/app'), import('@capacitor/browser')]);
        browserRef.current = Browser;
        const [{ version }, res] = await Promise.all([App.getInfo(), fetch('/api/app-version').then(r => r.json())]);
        if (isVersionLower(version, res.minRequiredVersion)) {
          setState({ blocked: true, soft: false, apkUrl: res.apkUrl, notes: res.releaseNotes });
        } else if (isVersionLower(version, res.latestVersion)) {
          setState({ blocked: false, soft: true, apkUrl: res.apkUrl, notes: res.releaseNotes });
        }
      } catch (e) {
        console.error('UpdateGate version check failed:', e);
      }
    })();
  }, []);

  if (state.blocked) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#070a0f', zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center',
      }}>
        <h2 style={{ color: '#E5E7EB', marginBottom: 8, fontSize: 20 }}>Update required</h2>
        <p style={{ color: '#9CA3AF', marginBottom: 20, fontSize: 14 }}>{state.notes || 'A new version is required to continue using the app.'}</p>
        <button className="btn btn-primary" onClick={() => browserRef.current?.open({ url: state.apkUrl! })}>
          Download latest APK
        </button>
      </div>
    );
  }

  return (
    <>
      {state.soft && (
        <div style={{
          background: 'rgba(37,99,235,0.15)', padding: '8px 16px', fontSize: 12, color: '#3B82F6',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>A new version is available</span>
          <button
            onClick={() => browserRef.current?.open({ url: state.apkUrl! })}
            style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 700, cursor: 'pointer' }}
          >Update</button>
        </div>
      )}
      {children}
    </>
  );
}
