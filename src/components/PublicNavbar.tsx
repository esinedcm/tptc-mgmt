import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function PublicNavbar() {
  const customPages = await prisma.customPage.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'asc' }
  });
  const settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
  const logoUrl = settings?.logoUrl || process.env.NEXT_PUBLIC_CLUB_LOGO_URL;

  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "The Tennis Club";

  let navLinks = [
    { label: "Facilities", url: "/#facilities", isExternal: false },
    { label: "Membership", url: "/interest", isExternal: false },
    { label: "Calendar", url: "/calendar", isExternal: false }
  ];

  if (settings?.navigationLinks) {
    try {
      const parsed = typeof settings.navigationLinks === 'string' ? JSON.parse(settings.navigationLinks) : settings.navigationLinks;
      if (Array.isArray(parsed)) {
        navLinks = parsed;
      }
    } catch(e) {}
  }

  return (
    <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
            ) : (
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                T
              </div>
            )}
            <span className="font-extrabold text-xl tracking-tight text-gray-900">{clubName}</span>
          </Link>
          <div className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link: any, idx: number) => (
              <Link 
                key={`nav-${idx}`} 
                href={link.url} 
                target={link.isExternal ? "_blank" : undefined}
                rel={link.isExternal ? "noopener noreferrer" : undefined}
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {customPages.map((p: any) => (
              <Link key={p.id} href={`/p/${p.slug}`} className="text-gray-600 hover:text-primary-600 font-medium transition-colors flex items-center gap-1">
                {p.title}
                {!p.isPublic && (
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                )}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-700 font-medium hover:bg-primary-50 px-4 py-2 rounded-full transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-600 text-white font-medium px-6 py-2.5 rounded-full hover:bg-primary-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Join Now
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
