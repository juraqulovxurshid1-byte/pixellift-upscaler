import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google"; // <-- Restores the missing font
import "./globals.css";

const inter = Inter({ subsets: ["latin"] }); // <-- Initializes the font

export const metadata: Metadata = {
  title: "PixelLift 🌌 Upscale & Enhance Images to 2K, 4K, 8K",
  description: "Upload an image and PixelLift enhances sharpness, detail and color...",
  // This cleanly injects your verification meta tag the official Next.js way:
  other: {
    monetag: "bff76b0ba8837568380b58ba98f1f4cb",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
