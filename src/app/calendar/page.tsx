import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const settings = await prisma.systemSetting.findUnique({
    where: { id: 'global' }
  });

  const iframeHtml = settings?.googleCalendarIframe;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      
      <main className="flex-grow pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 flex-grow flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 border-b pb-4">Club Calendar</h1>
          
          {iframeHtml ? (
            <div 
              className="flex-grow w-full h-full min-h-[600px] overflow-hidden rounded-lg border border-gray-200"
              dangerouslySetInnerHTML={{ __html: iframeHtml }}
            />
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Calendar not configured</h3>
              <p>The club calendar has not been set up yet. Please check back later.</p>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
