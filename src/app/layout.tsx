import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { generatePalette } from "@/lib/colorUtils";

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
  let primaryColor = "#4f46e5"; // default primary-600
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
    if (settings?.primaryColor) {
      primaryColor = settings.primaryColor;
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
  const themeStyles = `
    :root {
      ${Object.entries(palette).map(([weight, hex]) => `--primary-${weight}: ${hex};`).join('\n      ')}
    }
  `;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-gray-500 mt-auto border-t border-gray-200 bg-white">
          <p>© {process.env.NEXT_PUBLIC_BUILD_DATE ? process.env.NEXT_PUBLIC_BUILD_DATE.split('-')[0] : new Date().getFullYear()} {process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club"}</p>
          <p className="mt-1">
            Build v{process.env.NEXT_PUBLIC_BUILD_VERSION || "0.1.0"} 
            <span className="mx-1">•</span> 
            {process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString().split('T')[0]}
          </p>
        </footer>
      </body>
    </html>
  );
}
