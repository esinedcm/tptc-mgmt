import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from './ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
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
    where: { id: payload.userId as string }
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-gray-500">Update your contact information and address details.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <ProfileForm initialData={{
          phoneNumber: user.phoneNumber || '',
          streetNumber: user.streetNumber || '',
          streetName: user.streetName || '',
          city: user.city || '',
          postalCode: user.postalCode || ''
        }} />
      </div>
    </div>
  );
}
