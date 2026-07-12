import type React from "react";
import type { Metadata } from "next";
import {
  Anonymous_Pro,
  Archivo,
  IBM_Plex_Mono,
  Open_Sans,
} from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Toaster } from "sonner";

const anonymousPro = Anonymous_Pro({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-anonymous-pro",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Francesco Bassignana - Portfolio",
  description:
    "Portfolio of Francesco Bassignana — AI systems, generative models, computer vision, full-stack development, and research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-mono ${anonymousPro.variable} ${openSans.variable} ${archivo.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <Suspense fallback={null}>{children}</Suspense>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
