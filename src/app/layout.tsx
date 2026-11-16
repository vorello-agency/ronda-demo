import type { Metadata } from "next";
import localFont from "next/font/local";
import { site } from "@/config/site";
import "./globals.css";

const display = localFont({ src: "./fonts/anton-latin.woff2", variable: "--font-display", weight: "400", display: "swap" });
const body = localFont({ src: "./fonts/dm-sans-latin.woff2", variable: "--font-body", weight: "100 900", display: "swap" });

const title = `${site.name} · ${site.descriptor} — ${site.title}`;
const description = `${site.description} Proyecto conceptual de ${site.studio}.`;
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title,
  description,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: "es_UY", siteName: `${site.name} · ${site.descriptor}`, title, description },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-UY" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>;
}
