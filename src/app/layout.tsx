import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { generatePalette } from "@/lib/colorUtils";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { cookies } from 'next/headers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club",
  description: "Club Management Portal",
  icons: {
    icon: process.env.NEXT_PUBLIC_CLUB_FAVICON_URL || '/favicon.ico',
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get('auth_token')?.value;

  let primaryColor = "#4f46e5"; // default primary-600
  let secondaryColor = "#10b981"; // default emerald-500
  let fontFamily = "Inter";
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
    if (settings?.primaryColor) {
      primaryColor = settings.primaryColor;
    }
    if (settings?.secondaryColor) {
      secondaryColor = settings.secondaryColor;
    }
    if (settings?.fontFamily) {
      fontFamily = settings.fontFamily;
    }
  } catch (err: any) {
    if (err?.code === 'P2021') {
      // Table does not exist yet (first boot / migrations not run)
      console.log("Database not initialized yet. Using default theme settings.");
    } else {
      console.error("Failed to load global settings for layout", err);
    }
  }

  const palette = generatePalette(primaryColor);
  const secondaryPalette = generatePalette(secondaryColor);
  const themeStyles = `
    :root {
      ${Object.entries(palette).map(([weight, hex]) => `--primary-${weight}: ${hex};`).join('\n      ')}
      ${Object.entries(secondaryPalette).map(([weight, hex]) => `--secondary-${weight}: ${hex};`).join('\n      ')}
      --font-sans: '${fontFamily}', sans-serif;
    }
  `;
  
  const fontLink = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontLink} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
      </head>
      <body className="h-full bg-gray-50 flex flex-col min-h-screen" style={{ fontFamily: `'${fontFamily}', sans-serif` }}>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        {isLoggedIn && <FeedbackWidget />}
        <footer className="py-4 text-center text-xs text-gray-500 mt-auto border-t border-gray-200 bg-white">
          <p>© {process.env.NEXT_PUBLIC_BUILD_DATE ? process.env.NEXT_PUBLIC_BUILD_DATE.split('-')[0] : new Date().getFullYear()} {process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club"}</p>
          <p className="mt-1">
            Build v{process.env.NEXT_PUBLIC_BUILD_VERSION || "0.1.0"} 
            <span className="mx-1">•</span> 
            {process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString().split('T')[0]}
            <span className="mx-1">•</span> 
            Powered by Ace TCM
          </p>
        </footer>
      </body>
    </html>
  );
}
