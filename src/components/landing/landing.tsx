import Link from "next/link";
import { ArrowRight, ArrowDown, Check, Mic, TriangleAlert, X } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { cn } from "@/lib/utils";

export function Landing({ showDemo }: { showDemo: boolean }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="OrderSathi home" className="rounded-md">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            <a href="#how" className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-ink-2 hover:text-ink md:block">
              How it works
            </a>
            <a href="#trust" className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-ink-2 hover:text-ink md:block">
              Safeguards
            </a>
            <Link href="/sign-in" className="rounded-lg px-3 py-2 text-[14px] font-medium text-ink-2 hover:text-ink">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-[10px] bg-ink px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <GridTexture className="text-ink/[0.045] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:gap-12 lg:pb-24 lg:pt-20">
            <div>
              <p className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2">
                <span className="size-2 bg-volt ring-1 ring-ink" aria-hidden />
                For electrical wholesalers<span className="hidden sm:inline"> · Telangana & AP</span>
              </p>
              <h1 className="mt-6 text-[46px] font-bold leading-[0.98] tracking-[-0.05em] sm:text-[64px] lg:text-[76px]">
                Voice notes in.
                <br />
                <span className="marker">Priced orders</span> out.
              </h1>
              <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
                Retailers send orders as WhatsApp voice notes, photos of handwritten lists and quick messages — in Telugu, English or both. OrderSathi turns them into
                draft orders matched to <em className="font-semibold not-italic text-ink">your</em> catalogue and prices, and tells your team exactly what to confirm.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/sign-up"
                  className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-[15.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  Set up your business <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {showDemo && (
                  <Link
                    href="/sign-in#sample"
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-ink/80 bg-surface px-6 text-[15.5px] font-semibold text-ink transition-colors hover:bg-volt"
                  >
                    Explore the sample workspace
                  </Link>
                )}
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11.5px] text-muted">
                {["No card needed", "Exact ₹ to the paisa", "A person approves every order"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-ink" strokeWidth={2.5} /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* Inputs band */}
        <section aria-label="Supported inputs" className="overflow-hidden border-y-2 border-ink bg-volt py-4">
          <div className="flex w-max animate-marquee whitespace-nowrap font-display text-[22px] font-bold tracking-[-0.03em] sm:text-[26px]">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={k === 1 || undefined}>
                {["Voice notes", "Photos of handwritten lists", "Pasted WhatsApp messages", "తెలుగు + English", "Customer nicknames like “maamulu switch”", "Boxes, rolls & coils"].map((t) => (
                  <span key={t} className="flex items-center gap-10">
                    {t}
                    <span className="size-2.5 rotate-45 bg-ink" aria-hidden />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <SectionTitle eyebrow="How it works" title={<>From a 40-second voice note to an approved order in under a minute.</>} />
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {[
              { t: "Receive", d: "Paste the message, upload the voice note, or snap the list. Pick the customer — or let OrderSathi suggest one." },
              { t: "Understand", d: "Quantities, units, brands and ratings are pulled out. “2.5 sq mm wire” stays a size, never a quantity." },
              { t: "Resolve", d: "Each line is matched to your catalogue. Anything unclear is flagged with the exact reason and one-click choices." },
              { t: "Approve & share", d: "A manager approves, prices lock, and a clean order confirmation PDF is ready for WhatsApp." },
            ].map((s, i) => (
              <li key={s.t} className="border-t-2 border-ink pt-5">
                <span className="font-mono text-[13px] font-medium text-muted">0{i + 1}</span>
                <h3 className="mt-3 font-display text-[22px] font-bold tracking-[-0.03em]">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Review showcase */}
        <section className="relative overflow-hidden bg-night text-white">
          <GridTexture className="text-white/[0.04]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-28">
            <div>
              <Eyebrow className="text-volt">The review screen</Eyebrow>
              <h2 className="mt-4 text-[34px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[48px]">
                Uncertainty, explained in <span className="text-volt">plain words.</span>
              </h2>
              <p className="mt-5 max-w-lg text-[16.5px] leading-relaxed text-white/65">
                No mysterious confidence scores. When a retailer says “five sockets”, OrderSathi shows that both 6A and 16A match and lets your staff pick in one click —
                or drafts a clarification in Telugu or English for you to send.
              </p>
              <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {[
                  "Brand not specified — Anchor, Havells and Legrand match",
                  "15 pieces = 1.5 packets — sold only in whole packets",
                  "“katta” is not a recognised unit — choose the unit",
                  "Price changed from ₹40.00 to ₹42.00 since this line was priced",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 py-3 text-[14.5px] text-white/90">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-volt" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <ClarifyMock />
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionTitle eyebrow="Built for the counter" title="Everything a busy order desk needs. Nothing it doesn’t." />
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-2">
              Made with wholesalers who sell switches, wire and fittings by the box, roll and coil — and price every customer a little differently.
            </p>
          </div>
          <ul className="border-t border-line">
            {[
              { t: "Your prices, always", d: "Standard and customer-specific prices from your catalogue, calculated in exact paise with Indian digit grouping." },
              { t: "Order confirmations, not fake invoices", d: "A clean PDF clearly labelled “Order confirmation”. Tax only appears if you configure it." },
              { t: "Roles that match your shop", d: "Operators draft, managers approve, owners manage settings — enforced on the server, not just hidden buttons." },
              { t: "Speaks your customers’ language", d: "Telugu script, romanised Telugu and English — plus each customer’s own words for your products." },
              { t: "Prices lock at approval", d: "Approved orders keep their snapshot. Changing the catalogue tomorrow never rewrites yesterday’s order." },
              { t: "Catalogue in minutes", d: "Import a CSV with column mapping and row-by-row checks, or add products by hand. Pack sizes and conversions included." },
            ].map((f, i) => (
              <li key={f.t} className="group grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-line py-6">
                <span className="pt-1 font-mono text-[12px] font-medium text-muted transition-colors group-hover:text-ink">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-display text-[20px] font-bold tracking-[-0.025em]">{f.t}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Safeguards */}
        <section id="trust" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div>
                <SectionTitle eyebrow="Safeguards" title="A person approves every order." />
                <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-2">
                  OrderSathi prepares the work; your team makes the decisions. It is designed to be wrong safely — when it isn’t sure, it says so.
                </p>
              </div>
              <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                {[
                  "Invents products, prices, discounts or stock",
                  "Picks a variant the customer didn’t specify",
                  "Converts boxes, rolls or metres without your pack sizes",
                  "Sends a message on its own — you press send",
                  "Reads your personal WhatsApp chats",
                  "Follows instructions hidden inside messages or photos",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 bg-surface p-5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-ink text-volt">
                      <X className="size-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-[15px] leading-snug">
                      <span className="mb-0.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-bad">Never</span>
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-y-2 border-ink bg-volt">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-24">
            <div>
              <h2 className="max-w-2xl text-[40px] font-bold leading-[0.98] tracking-[-0.05em] sm:text-[60px]">Clear today’s orders before lunch.</h2>
              <p className="mt-4 text-[17px] text-ink/75">Set up your catalogue and first customer in about ten minutes.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/sign-up"
                className="group inline-flex h-13 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-ink px-6 text-[15.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Get started <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {showDemo && (
                <Link
                  href="/sign-in#sample"
                  className="inline-flex h-13 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border-2 border-ink px-6 text-[15.5px] font-semibold text-ink transition-colors hover:bg-ink hover:text-volt"
                >
                  Try the sample workspace
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-night text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo tone="dark" />
          <p className="font-mono text-[11.5px] text-white/50">Order confirmations are not tax invoices · Sample workspace data is fictional</p>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[11.5px] font-medium uppercase tracking-[0.16em] text-muted", className)}>{children}</p>;
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[34px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[46px]">{title}</h2>
    </div>
  );
}

function GridTexture({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", backgroundSize: "40px 40px" }}
    />
  );
}

const WAVE = [5, 9, 15, 8, 19, 12, 6, 16, 22, 10, 5, 14, 18, 8, 12, 20, 11, 6, 15, 9, 4, 12, 17, 7, 10, 14, 6];

/** Static illustration: a WhatsApp voice note becoming a reviewed draft order (not live data). */
function HeroVisual() {
  return (
    <div aria-hidden className="relative">
      <div className="relative overflow-hidden rounded-[28px] bg-night p-4 shadow-[0_40px_80px_-40px_rgb(15_15_14/0.55)] sm:p-6">
        <GridTexture className="text-white/[0.05]" />
        {/* Incoming voice note */}
        <div className="relative max-w-[88%] rounded-2xl rounded-tl-md bg-night-2 p-3.5 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-volt text-ink">
              <Mic className="size-4" strokeWidth={2.5} />
            </span>
            <div className="flex h-7 flex-1 items-center gap-[3px]">
              {WAVE.map((h, i) => (
                <span key={i} className={cn("w-[3px] rounded-full", i < 11 ? "bg-volt" : "bg-white/25")} style={{ height: h }} />
              ))}
            </div>
            <span className="font-mono text-[11px] text-white/50">0:38</span>
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/80" lang="te">
            “పది ఆంకర్ 6A స్విచ్‌లు, <span className="rounded bg-volt px-1 text-ink">five sockets</span>, two rolls Polycab 2.5 red…”
          </p>
          <p className="mt-1 text-right font-mono text-[10px] text-white/40">Sai Electricals · 10:42</p>
        </div>

        <p className="relative my-3.5 flex items-center gap-2 pl-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-volt">
          <ArrowDown className="size-3.5" /> Draft order #0014 · 3 lines
        </p>

        {/* Draft order */}
        <div className="relative overflow-hidden rounded-2xl bg-white text-ink">
          <ul className="divide-y divide-line">
            <HeroLine said="పది ఆంకర్ 6A స్విచ్‌లు" name="Anchor Roma 6A 1-way switch" meta="ANC-RS-6A-1W · 10 pcs" total="₹420.00" />
            <HeroLine said="two rolls Polycab 2.5 red" name="Polycab FR 2.5 sq mm wire, red" meta="POL-FR-2.5-RD · 2 rolls" total="₹5,380.00" />
            <li className="relative px-4 py-3">
              <span className="absolute inset-y-0 left-0 w-1 bg-warn-strong" />
              <p className="text-[11px] italic text-muted">“five sockets”</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-warn">
                <TriangleAlert className="size-3.5" /> Rating not specified — 6A or 16A?
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-md border-2 border-ink bg-volt px-2 py-0.5 text-[11.5px] font-semibold">Anchor · 6A</span>
                <span className="rounded-md border border-line-strong px-2 py-0.5 text-[11.5px] font-medium">Anchor · 16A</span>
                <span className="rounded-md border border-line-strong px-2 py-0.5 text-[11.5px] font-medium">Havells · 6A</span>
              </div>
            </li>
          </ul>
          <div className="flex items-center justify-between border-t border-line bg-surface-2 px-4 py-3">
            <span className="text-[12px] text-muted">
              Estimated total <span className="ml-1 font-display text-[16px] font-bold text-ink tnum">₹5,800.00</span>
            </span>
            <span className="rounded-lg bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-white">Approve</span>
          </div>
        </div>
      </div>
      {/* Sticker */}
      <div className="absolute -right-2 -top-4 rotate-[6deg] rounded-xl border-2 border-ink bg-volt px-3 py-2 shadow-[4px_4px_0_0_var(--color-ink)] sm:-right-4">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em]">2 of 3 matched</p>
        <p className="font-display text-[19px] font-bold leading-none tracking-[-0.03em]">1 to check</p>
      </div>
    </div>
  );
}

function HeroLine({ said, name, meta, total }: { said: string; name: string; meta: string; total: string }) {
  return (
    <li className="relative px-4 py-3">
      <span className="absolute inset-y-0 left-0 w-1 bg-ok" />
      <p className="text-[11px] italic text-muted" lang="te">
        “{said}”
      </p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
            <Check className="size-3.5 shrink-0 text-ok" strokeWidth={3} />
            {name}
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] text-muted">{meta}</p>
        </div>
        <p className="shrink-0 text-[13px] font-semibold tnum">{total}</p>
      </div>
    </li>
  );
}

function ClarifyMock() {
  return (
    <div aria-hidden className="relative">
      <div className="rounded-[24px] bg-white p-5 text-ink shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)] sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-[17px] font-bold tracking-[-0.02em]">Ask the customer</p>
          <span className="flex rounded-lg bg-sunken p-0.5 text-[11.5px]">
            <span className="rounded-md bg-ink px-2.5 py-1 font-semibold text-white">తెలుగు</span>
            <span className="px-2.5 py-1 text-muted">English</span>
          </span>
        </div>
        <div className="mt-4 rounded-2xl rounded-tl-md bg-[#e7f7dc] p-4 text-[13.5px] leading-relaxed" lang="te">
          నమస్తే రవి గారు,
          <br />
          మీ ఆర్డర్ #14 గురించి కొన్ని వివరాలు కావాలి:
          <br />
          <br />
          1. “five sockets” — రేటింగ్ (Amp) ఏది? (6A / 16A)
          <br />
          2. “five sockets” — బ్రాండ్ ఏది? (Anchor / Havells)
          <br />
          <br />
          ధన్యవాదాలు,
          <br />
          Sri Lakshmi Electricals
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <span className="rounded-lg border border-line-strong px-3 py-2 text-[12.5px] font-semibold">Copy message</span>
          <span className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12.5px] font-semibold text-white">
            <Check className="size-3.5 text-volt" strokeWidth={3} /> Open in WhatsApp
          </span>
        </div>
        <p className="mt-2.5 text-right font-mono text-[10.5px] text-muted">Nothing is sent until you press send in WhatsApp.</p>
      </div>
    </div>
  );
}
