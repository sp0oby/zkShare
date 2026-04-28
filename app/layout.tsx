import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ChatWidget } from '@/components/chat-widget'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zkshare.io";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ZKshare — Privacy-oriented context API",
    template: "%s | ZKshare",
  },
  description:
    "Store encrypted facts, prove properties without revealing them, and share verifiable answers between agents — through a single API endpoint. AES-256-GCM encryption, HMAC proof envelopes, pgvector search, and an end-to-end-encrypted path.",
  keywords: [
    "privacy API",
    "zero-knowledge",
    "encrypted context",
    "AI agents",
    "proof envelopes",
    "semantic search",
    "pgvector",
    "end-to-end encryption",
    "HMAC",
    "AES-256-GCM",
  ],
  authors: [{ name: "sp0obs" }],
  creator: "sp0obs",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "ZKshare",
    title: "ZKshare — Privacy-oriented context API",
    description:
      "Store encrypted facts, prove properties without revealing them, and share verifiable answers between agents — through a single endpoint.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ZKshare — Privacy-oriented context API",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZKshare — Privacy-oriented context API",
    description:
      "Encrypted facts, signed proof envelopes, semantic search over encrypted data, and E2EE storage. One endpoint, six operations.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased bg-background">
        {children}
        <ChatWidget />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
