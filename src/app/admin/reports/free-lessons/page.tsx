import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

function calculateAgeCategory(dateOfBirth: Date | null): string {
  if (!dateOfBirth) return 'Unknown Age';
  
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age < 18 ? 'Juniors (Under 18)' : 'Adults (18+)';
}

export default async function FreeLessonsReport() {
  const interestedUsers = await prisma.user.findMany({
    where: {
      wantsFreeLessons: true
    },
    orderBy: {
      firstName: 'asc'
    }
  });

  const generatedDate = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  // Group by Age Category then by Gender
  const groups: Record<string, Record<string, typeof interestedUsers>> = {
    'Juniors (Under 18)': {},
    'Adults (18+)': {},
    'Unknown Age': {}
  };

  interestedUsers.forEach(user => {
    const ageCategory = calculateAgeCategory(user.dateOfBirth);
    const gender = user.gender || 'Not Specified';
    
    if (!groups[ageCategory][gender]) {
      groups[ageCategory][gender] = [];
    }
    groups[ageCategory][gender].push(user);
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Free Lessons Interest Report</h1>
            <p className="mt-1 text-sm text-gray-500">Date Generated: {generatedDate}</p>
          </div>
          <div className="flex gap-4 print:hidden">
            <PrintButton />
            <Link 
              href="/admin/reports" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Back to Reports
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groups).map(([ageCategory, genderGroups]) => {
            const hasAnyMembers = Object.values(genderGroups).some(list => list.length > 0);
            
            if (!hasAnyMembers) return null;

            return (
              <div key={ageCategory} className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-400">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-400 bg-orange-50">
                  <h3 className="text-lg leading-6 font-bold text-orange-900">{ageCategory}</h3>
                </div>
                
                <div className="p-4 space-y-6">
                  {Object.entries(genderGroups).map(([gender, users]) => (
                    <div key={gender} className="border border-gray-300 rounded-md">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-700">{gender}</h4>
                        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 rounded-full">{users.length} members</span>
                      </div>
                      
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="min-w-full divide-y divide-gray-400">
                          <thead className="bg-white">
                            <tr>
                              <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-300">
                            {users.map((user) => (
                              <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 whitespace-nowrap print:whitespace-normal text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap print:whitespace-normal text-sm text-gray-500">
                                  {user.email}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap print:whitespace-normal text-sm text-gray-500">
                                  {user.phoneNumber || 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
      </div>
    </div>
  );
}
