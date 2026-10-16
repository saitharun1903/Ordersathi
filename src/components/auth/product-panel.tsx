import { AlertTriangle, Check, Mic, ShieldCheck } from "lucide-react";

const BARS = [6, 10, 14, 9, 18, 22, 12, 8, 16, 20, 11, 7, 13, 19, 15, 9, 6, 12, 17, 10, 8, 14, 11, 6];

/** Static, illustrative product preview shown beside the auth forms (lg+ only). */
export function ProductPanel() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden bg-[#0d5a45] lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-20">
      {/* faint grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />
      <div className="relative mx-auto w-full max-w-[460px]">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#a9d3c1]">How it works</p>
        <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.015em] text-white">
          A voice note in. A clean, reviewed order out.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#cfe5d9]">
          OrderSathi reads WhatsApp voice notes, photos of handwritten lists and typed messages, matches them to your catalogue, and flags anything it is unsure about.
        </p>

        <div className="mt-8 rounded-2xl bg-[#f6f4ee] p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)]">
          {/* voice note */}
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
              <Mic className="size-4" />
            </span>
            <div className="flex h-6 flex-1 items-center gap-[3px]">
              {BARS.map((h, i) => (
                <span key={i} className="w-[3px] rounded-full bg-brand/60" style={{ height: h }} />
              ))}
            </div>
            <span className="text-xs text-muted tnum">0:18</span>
          </div>
          <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink-2">
            “Switch 20 pieces, 1.5 wire 2 coils, socket kuda 10 ivvandi…”
          </p>

          {/* extracted lines */}
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[12px] font-semibold text-ink">Draft order · 3 lines</span>
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">1 to check</span>
            </div>
            <Line name="Modular switch 6A, white" qty="20 pcs" />
            <Line name="FR wire 1.5 sq mm · 90 m coil" qty="2 coils" />
            <div className="relative px-3 py-2.5">
              <span className="absolute inset-y-0 left-0 w-[3px] bg-warn-strong" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink">Modular socket, white</span>
                <span className="text-[13px] text-ink-2 tnum">10 pcs</span>
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-warn-soft px-2 py-1 text-[12px] font-medium text-warn">
                <AlertTriangle className="size-3.5" />
                Rating not specified — 6A or 16A?
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 flex items-center gap-2 text-[13px] text-[#cfe5d9]">
          <ShieldCheck className="size-4 text-[#e3a43b]" />
          Nothing is confirmed until someone on your team approves it.
        </p>
      </div>
    </aside>
  );
}

function Line({ name, qty }: { name: string; qty: string }) {
  return (
    <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-ok" />
      <span className="flex items-center gap-2 text-[13px] text-ink">
        <Check className="size-3.5 text-ok" />
        {name}
      </span>
      <span className="text-[13px] text-ink-2 tnum">{qty}</span>
    </div>
  );
}
