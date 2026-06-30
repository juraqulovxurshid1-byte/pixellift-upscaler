import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixelLift — Upscale & Enhance Images to 2K, 4K, 8K",
  description:
    "Upload an image and PixelLift enhances sharpness, detail and color, upscaling it to crisp 2K, 4K or 8K resolution — privately, right in your browser.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
