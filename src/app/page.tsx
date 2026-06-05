import Link from 'next/link';

export default function Home() {
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "The Tennis Club";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navigation Bar */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              {process.env.NEXT_PUBLIC_CLUB_LOGO_URL ? (
                <img src={process.env.NEXT_PUBLIC_CLUB_LOGO_URL} alt="Logo" className="h-10 w-auto" />
              ) : (
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  T
                </div>
              )}
              <span className="font-extrabold text-xl tracking-tight text-gray-900">{clubName}</span>
            </div>
            <div className="hidden md:flex space-x-8 items-center">
              <a href="#facilities" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Facilities</a>
              <a href="#community" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Community</a>
              <Link href="/interest" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Membership</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/login" 
                className="text-primary-700 font-medium hover:bg-primary-50 px-4 py-2 rounded-full transition-colors hidden sm:block"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="bg-primary-600 text-white font-medium px-6 py-2.5 rounded-full hover:bg-primary-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Join Now
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex-grow flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero_tennis_court.png" 
            alt="Tennis Court at Sunset" 
            className="w-full h-full object-cover filter brightness-[0.4]"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight drop-shadow-lg mb-6 leading-tight">
            Elevate Your Game at <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-green-400">
              {clubName}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-200 drop-shadow mb-10">
            Experience premier tennis facilities, professional coaching, and a vibrant community of players of all levels.
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
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Pristine Courts</h3>
              <p className="text-gray-600 leading-relaxed">Play on our perfectly maintained surfaces. Easy online booking ensures your court is ready when you are.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Expert Coaching</h3>
              <p className="text-gray-600 leading-relaxed">Elevate your skills with our certified professionals offering group clinics and private lessons.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Vibrant Community</h3>
              <p className="text-gray-600 leading-relaxed">Join tournaments, ladders, and social events. Find playing partners easily through our member portal.</p>
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
            className="inline-block bg-white text-primary-900 font-bold px-10 py-4 rounded-full hover:bg-gray-100 shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1 text-lg"
          >
            Create Your Account
          </Link>
          <div className="mt-8">
            <Link href="/login" className="text-primary-200 hover:text-white font-medium transition-colors">
              Already a member? Sign in here &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-sm">T</div>
            <span className="text-gray-300 font-semibold">{clubName}</span>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} {clubName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
