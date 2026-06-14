import { cookies } from 'next/headers';
import { FeedbackFooterLink } from './FeedbackFooterLink';

export default async function PublicFooter() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get('auth_token')?.value;
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "The Tennis Club";

  return (
    <footer className="bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-sm">T</div>
          <span className="text-gray-300 font-semibold">{clubName}</span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 text-gray-500 text-sm">
          {isLoggedIn && (
            <>
              <FeedbackFooterLink />
              <span className="hidden md:inline">&bull;</span>
            </>
          )}
          <span>&copy; {new Date().getFullYear()} {clubName}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
