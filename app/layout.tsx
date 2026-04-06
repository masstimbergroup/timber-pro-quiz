import type { Metadata } from "next";
import { Poppins, Caveat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const scandia = localFont({
  src: [
    { path: "../public/fonts/ScandiaWebLight.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/ScandiaWebMedium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/ScandiaWebBold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-scandia",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Timber Pro Product Finder",
  description: "Find the right Timber Pro coating product for your project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${scandia.variable} ${poppins.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
