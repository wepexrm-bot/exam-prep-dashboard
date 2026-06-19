import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, TOKEN_NAME } from '@/lib/auth';
import DashboardShell from './DashboardShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  const auth = token ? verifyToken(token) : null;
  if (!auth) redirect('/login');
  return (
    <DashboardShell username={auth.name} examType={auth.examType}>
      {children}
    </DashboardShell>
  );
}
