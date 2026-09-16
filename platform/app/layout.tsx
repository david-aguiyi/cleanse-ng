import type { Metadata } from "next";
import { Lexend, Nunito } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lexend",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cleanse.ng — Book a Cleaning",
  description:
    "Book professional residential cleaning in Ibadan. Flat pricing, vetted teams, secure Paystack checkout.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Cleanse Cleaner", statusBarStyle: "black-translucent" },
};

export const viewport = {
  themeColor: "#1A0D33",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
