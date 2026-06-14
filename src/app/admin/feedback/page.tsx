import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import Link from 'next/link';
import FeedbackList from './FeedbackList';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyJwt(token);
  if (!payload || !payload.userId) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
  });

  if (!user || !['ADMIN', 'PRO'].includes(user.role)) {
    redirect('/');
  }

  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
          <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Dashboard
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
      </div>
      <FeedbackList initialFeedback={feedback} />
    </div>
  );
}
