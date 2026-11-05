import type { Metadata } from "next";
import localFont from "next/font/local";
import { site } from "@/config/site";
import "./globals.css";

const display = localFont({ src: "./fonts/anton-latin.woff2", variable: "--font-display", weight: "400", display: "swap" });
const body = localFont({ src: "./fonts/dm-sans-latin.woff2", variable: "--font-body", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: `${site.name} · ${site.descriptor} — ${site.title}`,
  description: `${site.description} Proyecto conceptual de ${site.studio}.`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-UY" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>;
}
