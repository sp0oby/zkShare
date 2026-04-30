import type { Metadata, Viewport } from 'next'
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
    "Store encrypted facts, prove properties without revealing them, and share verifiable answers between agents — HTTPS JSON API (`POST /api/v1/context`) plus optional MCP via the `zkshare-mcp` package on npm (Cursor & compatible hosts). AES-256-GCM, HMAC proof envelopes, pgvector search.",
  keywords: [
    "privacy API",
    "zero-knowledge",
    "encrypted context",
    "AI agents",
    "zkshare-mcp",
    "Cursor MCP",
    "MCP Registry",
    "io.github.sp0oby/zkshare",
    "npm",
    "proof envelopes",
    "semantic search",
    "pgvector",
    "Model Context Protocol",
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
      "HTTPS API + optional MCP adapter (`zkshare-mcp` on npm). Encrypted facts, signed proof envelopes, semantic search.",
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
      "HTTPS API + optional MCP for Cursor (`zkshare-mcp`). Encrypted facts, proof envelopes, pgvector search, six operations.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
