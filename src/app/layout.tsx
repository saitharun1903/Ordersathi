import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-telugu/500.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "OrderSathi", template: "%s · OrderSathi" },
  description: "Order desk for electrical wholesalers — turn voice notes, photos and messages into reviewed orders.",
};

export const viewport: Viewport = {
  themeColor: "#0f0f0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
