'use client';
import { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileTopBar, MobileBottomNav, MobileDrawer } from '@/components/layout/MobileNav';
import { ToastContainer, showToast } from '@/components/ui';
import { ExamType } from '@/models/User';

function Shell({ username, examType, children }: { username: string; examType: ExamType; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loadData } = useApp();

  async function handleSync() {
    showToast('Syncing\u2026');
    await loadData();
    showToast('Data synced');
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden max-w-full">
      {/* Desktop sidebar — hidden below md breakpoint (768px) */}
      <div className="hidden md:block">
        <Sidebar onSync={handleSync} username={username} examType={examType} />
      </div>

      {/* Mobile top bar — hidden at md and above */}
      <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} examType={examType} />

      <MobileDrawer
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenDrawer={() => setDrawerOpen(true)}
        onSync={handleSync}
        username={username}
        examType={examType}
      />

      <main className="flex-1 min-w-0 md:ml-[230px] px-4 py-7 md:px-7 pt-[72px] md:pt-7 pb-[80px] md:pb-7 max-w-[1160px] overflow-x-hidden">
        {children}
      </main>

      {/* Mobile bottom nav — hidden at md and above */}
      <MobileBottomNav />

      <ToastContainer />
    </div>
  );
}

export default function DashboardShell({
  username,
  examType,
  children,
}: {
  username: string;
  examType: ExamType;
  children: React.ReactNode;
}) {
  return (
    <AppProvider examType={examType} username={username}>
      <Shell username={username} examType={examType}>{children}</Shell>
    </AppProvider>
  );
}