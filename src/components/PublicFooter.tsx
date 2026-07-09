import { cookies } from 'next/headers';
import { FeedbackFooterLink } from './FeedbackFooterLink';
import { prisma } from '@/lib/prisma';

export default async function PublicFooter() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get('auth_token')?.value;
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "The Tennis Club";

  let sponsorLogos: any[] = [];
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
    if (settings?.sponsorLogos) {
      sponsorLogos = typeof settings.sponsorLogos === 'string' ? JSON.parse(settings.sponsorLogos) : settings.sponsorLogos;
      if (!Array.isArray(sponsorLogos)) sponsorLogos = [];
    }
  } catch (e) {
    console.error("Failed to fetch sponsor logos", e);
  }

  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {clubName.charAt(0)}
          </div>
          <span className="text-gray-900 font-semibold">{clubName}</span>
        </div>
        
        {sponsorLogos.length > 0 && (
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-6">
            {sponsorLogos.map((logo: any, idx: number) => {
              if (!logo.url) return null;
              
              const imageElement = (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={logo.url} 
                  alt={`Sponsor ${idx + 1}`} 
                  className="w-[101px] h-[94px] object-contain"
                />
              );

              return logo.link ? (
                <a 
                  key={idx}
                  href={logo.link}
                  target={logo.isExternal ? "_blank" : undefined}
                  rel={logo.isExternal ? "noopener noreferrer" : undefined}
                  className="block hover:opacity-80 transition-opacity"
                >
                  {imageElement}
                </a>
              ) : (
                <div key={idx} className="block">
                  {imageElement}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
}
