import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";
import { siteConfig } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-editorial",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — Video Editor`, template: `%s — ${siteConfig.name}` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: { title: `${siteConfig.name} — Video Editor`, description: siteConfig.description, type: "website", images: ["/images/edit-suite.webp"] },
  twitter: { card: "summary_large_image", title: `${siteConfig.name} — Video Editor`, description: siteConfig.description, images: ["/images/edit-suite.webp"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrumentSerif.variable}`}
    >
      <body><a className="skip-link" href="#main">Skip to content</a><SiteChrome>{children}</SiteChrome></body>
    </html>
  );
}
