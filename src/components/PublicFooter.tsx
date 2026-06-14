export default function PublicFooter() {
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "The Tennis Club";

  return (
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
  );
}
