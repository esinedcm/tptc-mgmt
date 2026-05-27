import { RegistrationForm } from '@/components/RegistrationForm';
import { prisma } from '@/lib/prisma';

export default async function RegisterPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const params = await searchParams;
  const editToken = typeof params.editToken === 'string' ? params.editToken : undefined;
  const leadId = typeof params.leadId === 'string' ? params.leadId : undefined;

  const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
  const genderOptions = settings?.genderOptions || ['Male', 'Female', 'Prefer not to say'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {editToken ? 'Edit Registration' : `Join ${process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club"}`}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {editToken ? 'Update your household details below' : 'Fill out the form below to become a member'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <RegistrationForm initialEditToken={editToken} initialLeadId={leadId} genderOptions={genderOptions} />
      </div>
    </div>
  );
}
