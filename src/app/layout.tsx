import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import QueryProvider from "@/components/QueryProvider";


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
  manifest: "/manifest.json",
  openGraph: {
    title: "Power Systems Inc - Energy Solutions & Management",
    description: "Comprehensive energy solutions and management services",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "PSI Forms",
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
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ToastProvider />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
