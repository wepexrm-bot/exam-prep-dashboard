import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export default function Home() {
  const cookieStore = cookies();
  const token = cookieStore.get('gate_token')?.value;
  const auth = token ? verifyToken(token) : null;
  if (auth) redirect('/dashboard');
  else redirect('/login');
}
