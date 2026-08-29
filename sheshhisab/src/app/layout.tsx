import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { type ReactNode, Suspense } from "react";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { getToken } from "@/lib/auth-server";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "SheshHisab — money that settles once",
    template: "%s · SheshHisab",
  },
  description:
    "A fast, trustworthy fake-money wallet for sending, requesting, and proving every taka balances.",
};

async function AuthenticatedProvider({ children }: { children: ReactNode }) {
  const token = await getToken();

  return (
    <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Suspense
          fallback={<ConvexClientProvider>{children}</ConvexClientProvider>}
        >
          <AuthenticatedProvider>{children}</AuthenticatedProvider>
        </Suspense>
      </body>
    </html>
  );
}
