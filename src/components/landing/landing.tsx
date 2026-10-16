import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Ban,
  Check,
  CheckCircle2,
  FileAudio,
  FileText,
  ImageIcon,
  Languages,
  Lock,
  MessageSquareText,
  Quote,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { cn } from "@/lib/utils";

export function Landing({ showDemo }: { showDemo: boolean }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="OrderSathi home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            <a href="#how" className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:text-ink md:block">
              How it works
            </a>
            <a href="#trust" className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:text-ink md:block">
              Safeguards
            </a>
            <Link href="/sign-in" className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:text-ink">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-lg bg-brand px-3.5 py-2 text-[13.5px] font-medium text-white shadow-[0_1px_0_rgb(0_0_0/0.08)] hover:bg-brand-hover">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-medium text-brand-ink">
              <span className="size-1.5 rounded-full bg-brand" /> For electrical wholesalers in Telangana & Andhra Pradesh
            </p>
            <h1 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-5xl">
              Voice notes in.
              <br />
              <span className="text-brand">Clean, priced orders</span> out.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-2 sm:text-lg">
              Retailers send orders as WhatsApp voice notes, photos of handwritten lists and quick messages — in Telugu, English or both. OrderSathi turns
              them into draft orders matched to <em className="not-italic font-medium text-ink">your</em> catalogue and prices, and tells your team exactly
              what to confirm before anything is approved.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-medium text-white shadow-[var(--shadow-pop)] transition-colors hover:bg-brand-hover"
              >
                Set up your business <ArrowRight className="size-4" />
              </Link>
              {showDemo && (
                <Link
                  href="/sign-in#sample"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-6 text-[15px] font-medium text-ink hover:border-ink/25"
                >
                  Explore the sample workspace
                </Link>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">No card needed. The sample workspace uses fictional businesses and prices.</p>
          </div>
          <HeroMock />
        </section>

        {/* Inputs strip */}
        <section aria-label="Supported inputs" className="border-y border-line bg-surface-2">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {[
              { icon: FileAudio, t: "Voice notes", d: "Record or upload" },
              { icon: ImageIcon, t: "Photos of lists", d: "Handwritten or printed" },
              { icon: MessageSquareText, t: "Pasted messages", d: "Straight from WhatsApp" },
              { icon: Languages, t: "తెలుగు + English", d: "Mixed language is fine" },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-3 bg-surface-2 px-4 py-5 sm:px-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <x.icon className="size-4.5" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold">{x.t}</span>
                  <span className="block text-xs text-muted">{x.d}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
          <SectionTitle eyebrow="How it works" title="From a 40-second voice note to an approved order in under a minute" />
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { n: "1", t: "Receive", d: "Paste the message, upload the voice note, or snap the list. Choose the customer and language." },
              { n: "2", t: "Understand", d: "Quantities, units, brands and ratings are pulled out — “2.5 sq mm wire” stays a size, not a quantity." },
              { n: "3", t: "Resolve", d: "Each line is matched to your catalogue. Anything unclear is flagged with the exact reason and one-click choices." },
              { n: "4", t: "Approve & share", d: "A manager approves, prices lock, and a professional order confirmation PDF is ready to share." },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
                <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">{s.n}</span>
                <h3 className="mt-4 text-[16px] font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Review showcase */}
        <section className="bg-[#123f33] text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9fd2bb]">The review screen</p>
              <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">Uncertainty, explained in plain words</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-white/75">
                No mysterious confidence scores. When a retailer says “five sockets”, OrderSathi shows that both 6A and 16A sockets match and lets your staff pick
                in one click — or drafts a clarification message in Telugu or English for you to send.
              </p>
              <ul className="mt-6 space-y-3 text-[14.5px]">
                {[
                  "Brand not specified — Anchor, Havells and Legrand match",
                  "15 pieces = 1.5 packets — sold only in whole packets",
                  "“katta” is not a recognised unit — choose the unit",
                  "Price changed from ₹40.00 to ₹42.00 since this line was priced",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#f0bf62]" />
                    <span className="text-white/90">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ClarifyMock />
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <SectionTitle eyebrow="Built for the counter" title="Everything a busy order desk needs — nothing it doesn’t" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BadgeIndianRupee, t: "Your prices, always", d: "Standard and customer-specific prices from your catalogue, calculated in exact paise with Indian digit grouping." },
              { icon: FileText, t: "Order confirmations", d: "A clean PDF labelled “Order confirmation” — never passed off as a tax invoice. Tax only if you configure it." },
              { icon: Users, t: "Roles that match your shop", d: "Operators draft, managers approve, owners manage settings. Enforced on the server, not just hidden buttons." },
              { icon: Languages, t: "Speaks your customers’ language", d: "Telugu script, romanised Telugu and English — plus each customer’s own words, like “maamulu switch”." },
              { icon: Lock, t: "Prices lock at approval", d: "Approved orders keep their snapshot. Changing the catalogue tomorrow never rewrites yesterday’s order." },
              { icon: CheckCircle2, t: "Catalogue in minutes", d: "Import a CSV with column mapping and row-by-row checks, or add products by hand. Pack sizes and conversions included." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
                <f.icon className="size-5 text-brand" />
                <h3 className="mt-3 text-[15.5px] font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="scroll-mt-20 border-t border-line bg-surface-2">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                <ShieldCheck className="size-4" /> Safeguards
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">A person approves every order</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
                OrderSathi prepares the work; your team makes the decisions. It is designed to be wrong safely — when it isn’t sure, it says so.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "Never invents products, prices, discounts or stock",
                "Never picks a variant the customer didn’t specify",
                "Never converts boxes, rolls or metres without your pack sizes",
                "Never sends a message — you copy it or open WhatsApp yourself",
                "Never reads your personal WhatsApp chats",
                "Ignores instructions hidden inside messages or photos",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-[14px]">
                  <Ban className="mt-0.5 size-4 shrink-0 text-bad" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="flex flex-col items-start gap-6 rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-3xl">Clear today’s orders before lunch.</h2>
              <p className="mt-2 text-white/70">Set up your catalogue and first customer in about ten minutes.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-medium text-ink hover:bg-canvas">
                Get started <ArrowRight className="size-4" />
              </Link>
              {showDemo && (
                <Link href="/sign-in#sample" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 text-[15px] font-medium text-white hover:bg-white/10">
                  Try the sample workspace
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>Order confirmations are not tax invoices. Sample workspace data is fictional.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">{title}</h2>
    </div>
  );
}

/** Static illustration of the review screen (not live data). */
function HeroMock() {
  const lines = [
    { said: "పది ఆంకర్ 6A స్విచ్‌లు", name: "Anchor Roma 6A 1-way switch", sku: "ANC-RS-6A-1W", qty: "10 pcs", total: "₹420.00", ok: true },
    { said: "two rolls Polycab 2.5 red", name: "Polycab FR 2.5 sq mm wire, red, 90 m", sku: "POL-FR-2.5-RD", qty: "2 rolls", total: "₹5,380.00", ok: true },
    { said: "five sockets", name: null, sku: null, qty: "5", total: "—", ok: false },
  ];
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-3 -z-10 rounded-[28px] bg-[#e7e1d3]/60" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_60px_-30px_rgb(29_35_32/0.35)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-semibold">Order #0014</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warn-line bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">
              <span className="size-1.5 rounded-full bg-warn-strong" />
              Needs clarification
            </span>
          </div>
          <span className="text-[12px] text-muted">Sai Electricals</span>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-[0.8fr_1.2fr] sm:p-4">
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold">
              <FileAudio className="size-3.5 text-brand" /> Voice note · 0:38
            </p>
            <div className="flex h-8 items-center gap-[3px]">
              {[4, 9, 14, 7, 18, 11, 6, 16, 20, 9, 5, 13, 17, 8, 12, 19, 10, 6, 14, 8, 4, 11].map((h, i) => (
                <span key={i} className={cn("w-[3px] rounded-full", i < 9 ? "bg-brand" : "bg-line-strong")} style={{ height: h }} />
              ))}
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2" lang="te">
              “పది ఆంకర్ 6A స్విచ్‌లు, <mark className="rounded bg-[#f6dfa6] px-0.5">five sockets</mark>, two rolls Polycab 2.5 red…”
            </p>
          </div>
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.said} className="relative overflow-hidden rounded-lg border border-line bg-surface py-2 pl-3.5 pr-2.5">
                <span className={cn("absolute inset-y-0 left-0 w-1", l.ok ? "bg-ok" : "bg-warn-strong")} />
                <p className="flex items-center gap-1 text-[11px] italic text-muted">
                  <Quote className="size-2.5" />
                  {l.said}
                </p>
                {l.name ? (
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold">{l.name}</p>
                      <p className="font-mono text-[10px] text-muted">{l.sku}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[12.5px] font-semibold tnum">{l.total}</p>
                      <p className="text-[10px] text-muted">{l.qty}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1.5 rounded-md border border-warn-line bg-warn-soft/70 px-2 py-1.5">
                    <p className="flex items-center gap-1 text-[11.5px] font-medium text-warn">
                      <TriangleAlert className="size-3" /> Rating not specified — 6A or 16A?
                    </p>
                    <div className="mt-1.5 flex gap-1.5">
                      <span className="rounded border border-line-strong bg-surface px-1.5 py-0.5 text-[10.5px] font-medium">Anchor · 6A</span>
                      <span className="rounded border border-line-strong bg-surface px-1.5 py-0.5 text-[10.5px] font-medium">Anchor · 16A</span>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-surface-2 px-4 py-2.5">
          <span className="text-[12px] text-muted">
            Estimated total <span className="ml-1 text-[14px] font-semibold text-ink tnum">₹5,800.00</span>
          </span>
          <span className="rounded-lg bg-brand/50 px-3 py-1.5 text-[12px] font-medium text-white">Approve</span>
        </div>
      </div>
    </div>
  );
}

function ClarifyMock() {
  return (
    <div aria-hidden className="rounded-2xl bg-white p-5 text-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold">Ask the customer</p>
        <span className="rounded-md bg-sunken p-0.5 text-[11.5px]">
          <span className="rounded bg-white px-2 py-0.5 font-medium shadow-[var(--shadow-card)]">తెలుగు</span>
          <span className="px-2 text-muted">English</span>
        </span>
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5 text-[13px] leading-relaxed" lang="te">
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
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <span className="rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-medium">Copy message</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white">
          <Check className="size-3.5" /> Open in WhatsApp
        </span>
      </div>
      <p className="mt-2 text-right text-[11px] text-muted">Nothing is sent until you press send in WhatsApp.</p>
    </div>
  );
}
