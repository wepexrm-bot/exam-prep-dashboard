import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import DashboardShell from '@/app/dashboard/DashboardShell';

// Each page folder under app/ needs its own layout.
// To keep it DRY, they all import this shared one.
export function makeAuthLayout(pageName: string) {
  return function AuthLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = cookies();
    const token = cookieStore.get('gate_token')?.value;
    const auth = token ? verifyToken(token) : null;
    if (!auth) redirect('/login');
    return <DashboardShell username={auth.name} examType={auth.examType}>{children}</DashboardShell>;
  };
}
