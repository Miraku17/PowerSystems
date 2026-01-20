import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import QueryProvider from "@/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Power Systems Inc.",
  description:
    "Power Systems Inc provides comprehensive energy solutions and management services for residential and commercial applications.",
  keywords: [
    "power systems",
    "energy solutions",
    "energy management",
    "electrical services",
  ],
  authors: [{ name: "Power Systems Inc" }],
  icons: {
    icon: "/images/powersystemslogov1.jpg",
    shortcut: "/images/powersystemslogov1.jpg",
    apple: "/images/powersystemslogov1.jpg",
  },
  openGraph: {
    title: "Power Systems Inc - Energy Solutions & Management",
    description: "Comprehensive energy solutions and management services",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <QueryProvider>
          <ToastProvider />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
