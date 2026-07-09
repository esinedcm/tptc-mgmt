import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const settings = await prisma.systemSetting.findUnique({
    where: { id: 'global' }
  });

  const customPage = await prisma.customPage.findUnique({
    where: { slug: 'events' }
  });

  const iframeHtml = settings?.googleCalendarIframe;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      
      <main className="flex-grow pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 flex-grow flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 border-b pb-4">Club Events & Calendar</h1>
          
          {customPage && customPage.isPublished && (
            <div 
              className="text-gray-700 mb-10
                         [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:mt-8 [&_h1]:mb-6
                         [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4
                         [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3
                         [&_p]:leading-relaxed [&_p]:mb-5
                         [&_a]:text-primary-600 hover:[&_a]:underline
                         [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-5
                         [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-5
                         [&_li]:mb-2
                         [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500 [&_blockquote]:pl-4 [&_blockquote]:italic
                         [&_strong]:text-gray-900 [&_strong]:font-bold
                         [&_img]:max-w-full [&_img]:h-auto
                         [&_table]:border [&_table]:border-gray-300 [&_table]:w-full [&_table]:mb-6 [&_table]:border-collapse [&_table]:table-fixed
                         [&_th]:border [&_th]:border-gray-300 [&_th]:p-1.5 [&_th]:bg-gray-50 [&_th]:text-left [&_th]:font-semibold
                         [&_td]:border [&_td]:border-gray-300 [&_td]:p-1.5
                         [&_td:first-child]:font-bold [&_td:first-child]:w-1/3
                         [&_th:first-child]:w-1/3"
              dangerouslySetInnerHTML={{ __html: customPage.contentHtml }}
            />
          )}

          {iframeHtml ? (
            <div className="flex-grow w-full h-full min-h-[600px] overflow-hidden rounded-lg border border-gray-200">
              {iframeHtml.trim().toLowerCase().startsWith('<iframe') ? (
                <div 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:min-h-[600px]"
                  dangerouslySetInnerHTML={{ __html: iframeHtml }}
                />
              ) : iframeHtml.trim().toLowerCase().startsWith('http') ? (
                <iframe 
                  src={iframeHtml.trim()} 
                  style={{ border: 0 }} 
                  width="100%" 
                  height="100%" 
                  className="min-h-[600px]"
                  frameBorder="0" 
                  scrolling="no"
                />
              ) : (
                <div className="p-4 text-red-500">
                  Invalid calendar format provided. Please provide either an iframe embed code or a valid URL.
                </div>
              )}
            </div>
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
