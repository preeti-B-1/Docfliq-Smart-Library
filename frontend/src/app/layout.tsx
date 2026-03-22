import type { Metadata } from "next";
import { Merriweather, Merriweather_Sans } from "next/font/google";
import { getServerSession } from "next-auth";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/components/auth/SessionProvider";
import { authOptions } from "@/lib/auth";
import "@/styles/globals.css";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
});

const merriweatherSans = Merriweather_Sans({
  subsets: ["latin"],
  variable: "--font-merriweather-sans",
});

export const metadata: Metadata = {
  title: "DocFliq Smart Library",
  description: "AI-powered medical content library",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${merriweather.variable} ${merriweatherSans.variable}`}>
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
