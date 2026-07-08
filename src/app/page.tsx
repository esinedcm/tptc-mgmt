import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
  
  if (settings?.externalWebsiteUrl) {
    redirect(settings.externalWebsiteUrl);
  }

  const customPages = await prisma.customPage.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'asc' }
  });

  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "The Tennis Club";

  const heroTitle = settings?.heroTitle || "Elevate Your Game at";
  const heroSubtitle = settings?.heroSubtitle || "Experience premier tennis facilities, professional coaching, and a vibrant community of players of all levels.";
  const heroImageUrl = settings?.heroImageUrl || "/hero_tennis_court.png";
  const promoImageUrl = settings?.promoImageUrl;
  const promoLinkUrl = settings?.promoLinkUrl;
  const feature1Title = settings?.feature1Title || "Pristine Courts";
  const feature1Desc = settings?.feature1Desc || "Play on our perfectly maintained surfaces. Easy online booking ensures your court is ready when you are.";
  const feature2Title = settings?.feature2Title || "Expert Coaching";
  const feature2Desc = settings?.feature2Desc || "Elevate your skills with our certified professionals offering group clinics and private lessons.";
  const feature3Title = settings?.feature3Title || "Vibrant Community";
  const feature3Desc = settings?.feature3Desc || "Join tournaments, ladders, and social events. Find playing partners easily through our member portal.";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex-grow flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImageUrl} 
            alt="Tennis Court at Sunset" 
            className="w-full h-full object-cover filter brightness-[0.4]"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight drop-shadow-lg mb-6 leading-tight">
            {heroTitle} <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-green-400">
              {clubName}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-200 drop-shadow mb-10 whitespace-pre-wrap">
            {heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/register" 
              className="bg-white text-gray-900 font-bold px-8 py-4 rounded-full hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-lg flex items-center justify-center gap-2"
            >
              Become a Member
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </Link>
            <Link 
              href="/interest" 
              className="bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all text-lg flex items-center justify-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Promotional Showcase Section */}
      {!settings?.simpleLandingPage && promoImageUrl && (
        <section className="py-16 bg-gray-100 border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-sm font-semibold text-primary-600 tracking-wide uppercase">Club Announcements</h2>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white flex justify-center items-center p-2 hover:shadow-3xl transition-shadow duration-300">
              {promoLinkUrl ? (
                <a href={promoLinkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={promoImageUrl} alt="Promotional Event" className="w-full object-contain max-h-[600px] rounded-xl group-hover:opacity-95 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                    <span className="bg-primary-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      Learn More &rarr;
                    </span>
                  </div>
                </a>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={promoImageUrl} alt="Promotional Event" className="w-full object-contain max-h-[600px] rounded-xl" />
              )}
            </div>
          </div>
        </section>
      )}

      {!settings?.simpleLandingPage && (
        <>
          {/* Features Section */}
          <section id="facilities" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">World-Class Facilities</h2>
                <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">Everything you need to play your best tennis, whether you're a seasoned pro or picking up a racket for the first time.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Feature 1 */}
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
                  <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature1Title}</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{feature1Desc}</p>
                </div>
                
                {/* Feature 2 */}
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature2Title}</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{feature2Desc}</p>
                </div>
                
                {/* Feature 3 */}
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature3Title}</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{feature3Desc}</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-primary-900 py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl mb-6">Ready to hit the courts?</h2>
              <p className="text-xl text-primary-100 mb-10">Join our club today and get immediate access to our member portal and court booking system.</p>
              <Link 
                href="/register" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-primary-900 font-bold px-10 py-4 rounded-full hover:bg-gray-100 shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1 text-lg"
              >
                Create Your Account
              </Link>
              <div className="mt-8">
                <Link href="/login" target="_blank" rel="noopener noreferrer" className="text-primary-200 hover:text-white font-medium transition-colors">
                  Already a member? Sign in here &rarr;
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      <PublicFooter />
    </div>
  );
}
