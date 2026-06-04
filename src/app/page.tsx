import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {process.env.NEXT_PUBLIC_CLUB_LOGO_URL && (
          <img src={process.env.NEXT_PUBLIC_CLUB_LOGO_URL} alt="Club Logo" className="mx-auto h-24 w-auto mb-4" />
        )}
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome to the {process.env.NEXT_PUBLIC_CLUB_SHORT_NAME || "Club"} Portal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 flex flex-col gap-4">
          <Link 
            href="/interest"
            className="w-full flex justify-center text-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            I would like more information about {process.env.NEXT_PUBLIC_CLUB_NAME || "the club"}
          </Link>
          <Link 
            href="/register"
            className="w-full flex justify-center text-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            I'm ready to register at {process.env.NEXT_PUBLIC_CLUB_NAME || "the club"}
          </Link>
          
          <Link 
            href="/login"
            className="w-full flex justify-center text-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Member Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
