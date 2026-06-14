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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PublicNavbar />
      
      <main className="flex-grow pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 border-b pb-4">{page.title}</h1>
          <div 
            className="prose prose-lg prose-primary max-w-none text-gray-700
                       prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                       prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                       prose-p:leading-relaxed prose-p:mb-5
                       prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
                       prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-5
                       prose-ol:list-decimal prose-ol:pl-5 prose-ol:mb-5
                       prose-li:mb-2
                       prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:pl-4 prose-blockquote:italic
                       prose-strong:text-gray-900 prose-strong:font-bold"
            dangerouslySetInnerHTML={{ __html: page.contentHtml }}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
