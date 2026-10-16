import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContext, getSession } from "@/server/context";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "OrderSathi — orders from WhatsApp voice notes, photos and messages",
  description:
    "OrderSathi turns retailer voice notes, handwritten lists and messages into priced draft orders matched to your catalogue — in Telugu and English. Your team reviews and approves every order.",
};

export default async function Home() {
  const session = await getSession();
  if (session) {
    const ctx = await getContext();
    redirect(ctx ? "/dashboard" : "/onboarding");
  }
  return <Landing showDemo={process.env.SHOW_DEMO_LOGIN !== "false"} />;
}
