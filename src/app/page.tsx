import { redirect } from "next/navigation";
import { getContext, getSession } from "@/server/context";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const ctx = await getContext();
  redirect(ctx ? "/dashboard" : "/onboarding");
}
