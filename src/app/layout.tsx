import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

const appUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "News Trail E-Paper — Read the newspaper online",
    template: "%s | News Trail",
  },
  description:
    "Read the News Trail newspaper online — browse every edition page by page, zoom, clip and download articles, and search the archive.",
  applicationName: "News Trail",
  keywords: ["News Trail", "e-paper", "epaper", "newspaper", "India", "digital newspaper"],
  openGraph: {
    type: "website",
    siteName: "News Trail",
    title: "News Trail E-Paper",
    description: "Read the News Trail newspaper online — editions, archives and articles.",
    url: appUrl,
  },
  twitter: {
    card: "summary",
    title: "News Trail E-Paper",
    description: "Read the News Trail newspaper online — editions, archives and articles.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
