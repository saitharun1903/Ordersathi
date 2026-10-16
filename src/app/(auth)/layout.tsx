import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/context";
import { Logo } from "@/components/app/logo";
import { ProductPanel } from "@/components/auth/product-panel";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-10 lg:px-14">
        <header>
          <Link href="/sign-in" aria-label="OrderSathi" className="inline-flex rounded-md">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[400px]">{children}</div>
        </main>
        <footer className="text-xs text-faint">
          Built for electrical wholesalers in India · Orders are only confirmed after a person approves them.
        </footer>
      </div>
      <ProductPanel />
    </div>
  );
}
