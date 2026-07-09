import { notFound, redirect } from 'next/navigation';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomPageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.customPage.findUnique({
    where: { slug }
  });

  if (!page || !page.isPublished) {
    notFound();
  }

  if (!page.isPublic) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      redirect('/login');
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      redirect('/login');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      
      <main className="flex-grow pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 border-b pb-4">{page.title}</h1>
          <div 
            className="text-gray-700
                       [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:mt-8 [&_h1]:mb-6
                       [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4
                       [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3
                       [&_p]:leading-none [&_p]:mb-5
                       [&_a]:text-primary-600 hover:[&_a]:underline
                       [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-5
                       [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-5
                       [&_li]:mb-2
                       [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500 [&_blockquote]:pl-4 [&_blockquote]:italic
                       [&_strong]:text-gray-900 [&_strong]:font-bold
                       [&_img]:max-w-full [&_img]:h-auto
                       [&_table]:w-full [&_table]:mb-6 [&_table]:border-collapse [&_table]:table-fixed
                       [&_th]:border [&_th]:border-gray-200 [&_th]:p-3 [&_th]:bg-gray-50 [&_th]:text-left [&_th]:font-semibold
                       [&_td]:border [&_td]:border-gray-200 [&_td]:p-3
                       [&_td:first-child]:font-bold [&_td:first-child]:w-1/3
                       [&_th:first-child]:w-1/3"
            dangerouslySetInnerHTML={{ __html: page.contentHtml }}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
