import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-telugu/500.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "OrderSathi", template: "%s · OrderSathi" },
  description: "Order desk for electrical wholesalers — turn voice notes, photos and messages into reviewed orders.",
};

export const viewport: Viewport = {
  themeColor: "#f6f4ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
