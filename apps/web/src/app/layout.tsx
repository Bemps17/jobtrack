import { Providers } from "@/components/providers";
import { APP_VERSION } from "@/lib/version";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobTrack — Suivi de candidatures",
  description: `Suivi de candidatures — version ${APP_VERSION}`,
  applicationName: "JobTrack",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "JobTrack",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8602C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <ClerkProvider
          appearance={{
            variables: { colorPrimary: "#E8602C" },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
