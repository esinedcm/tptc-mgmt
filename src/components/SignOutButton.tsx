'use client';

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }}
      className="text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
    >
      Sign Out
    </button>
  );
}
