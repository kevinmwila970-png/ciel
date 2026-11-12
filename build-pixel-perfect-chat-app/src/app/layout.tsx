import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE = "https://3000-igni2f302eqwgv60z00gv.e2b.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Sage - A room for curious minds - Where knowledge grows",
  description:
    "Sage is a Socratic AI study tutor that teaches you how to think not what to think - Library with full books, Writing Pad, Research Trail, Quiz Studio, Voice Tutor, Study Planner, 40 themes",
  keywords:
    "Sage, Socratic tutor, AI study tutor, learning app, Project Gutenberg library, quiz studio, writing pad, research trail, study planner, voice tutor",
  authors: [{ name: "Sage" }],
  creator: "Sage",
  applicationName: "Sage",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }, { url: "/icon-192.png", sizes: "192x192" }],
  },
  appleWebApp: {
    capable: true,
    title: "Sage",
    statusBarStyle: "black-translucent",
  },
  alternates: { canonical: SITE },
  openGraph: {
    title: "Sage - A room for curious minds",
    description: "Socratic AI study tutor - Where knowledge grows",
    url: SITE,
    siteName: "Sage",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Sage quill logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sage - A room for curious minds",
    description: "Socratic AI study tutor - Where knowledge grows",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,520;9..144,640&family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var v=JSON.parse(localStorage.getItem("sage_theme_vars")||"null");if(v){var s=document.documentElement.style;for(var k in v)s.setProperty(k,v[k]);}var o=localStorage.getItem("sidebarOpen");if(o==="0")document.documentElement.dataset.sidebar="closed";}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
