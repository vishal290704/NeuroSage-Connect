import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "sonner";

export const metadata = {
  title: "NeuroSage — Be kind to your Mind.",
  description: "A thoughtful first step toward mental wellness awareness and appropriate support.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Toaster position="top-right" richColors closeButton />{children}</body>
    </html>
  );
}
