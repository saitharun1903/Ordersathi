import { AudioLines, Camera, FileText, Info, MessageCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/ui/status";

type ProviderState = "live" | "rules" | "demo" | "not_configured";
type Provider = { state: ProviderState; label: string; detail: string };
export type ProviderStatusData = { extraction: Provider; image: Provider; audio: Provider; whatsapp: Provider };

const STATE_PILL: Record<ProviderState, { label: string; tone: "ok" | "neutral" | "warn" }> = {
  live: { label: "Live", tone: "ok" },
  rules: { label: "Rule-based", tone: "neutral" },
  demo: { label: "Demo fixtures only", tone: "warn" },
  not_configured: { label: "Not connected", tone: "neutral" },
};

const ROWS = [
  { key: "extraction", title: "Text extraction", icon: FileText, env: "ANTHROPIC_API_KEY" },
  { key: "image", title: "Photo reading", icon: Camera, env: "ANTHROPIC_API_KEY" },
  { key: "audio", title: "Voice transcription", icon: AudioLines, env: "OPENAI_API_KEY" },
  { key: "whatsapp", title: "WhatsApp", icon: MessageCircle, env: null },
] as const;

export function ProcessingSection({ status }: { status: ProviderStatusData }) {
  const anyDemo = status.image.state !== "live" || status.audio.state !== "live" || status.extraction.state !== "live";
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="How orders are read" description="What OrderSathi can process in this deployment right now." />
        <ul className="divide-y divide-line">
          {ROWS.map(({ key, title, icon: Icon }) => {
            const s = status[key];
            const pill = STATE_PILL[s.state];
            return (
              <li key={key} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-[13.5px] font-medium text-ink">{title}</p>
                    <Pill tone={pill.tone} className="text-[11.5px]">
                      <span className={pill.tone === "ok" ? "size-1.5 rounded-full bg-ok" : pill.tone === "warn" ? "size-1.5 rounded-full bg-warn-strong" : "size-1.5 rounded-full bg-faint"} aria-hidden />
                      {pill.label}
                    </Pill>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {s.label}
                    {s.detail && s.detail !== s.label ? <> · {s.detail}</> : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {anyDemo && (
        <div className="flex gap-3 rounded-xl border border-warn-line bg-warn-soft px-4 py-3.5 text-[13px] leading-relaxed text-warn">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">About demo mode</p>
            <p className="mt-0.5">
              Without provider credentials, typed text is parsed by the deterministic rule-based parser, and only the bundled sample voice note and photo can be read. Arbitrary
              uploads need a connected provider.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader title="Connecting providers" description="Set these environment variables on the server, then restart OrderSathi. Keys are never shown in the app." />
        <dl className="divide-y divide-line text-[13px]">
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
            <dt className="sm:w-48">
              <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink">ANTHROPIC_API_KEY</code>
            </dt>
            <dd className="text-ink-2">Text extraction and photo reading</dd>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
            <dt className="sm:w-48">
              <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink">OPENAI_API_KEY</code>
            </dt>
            <dd className="text-ink-2">Voice note transcription</dd>
          </div>
        </dl>
      </Card>

      <Card className="px-4 py-3.5 sm:px-5">
        <div className="flex gap-3">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">WhatsApp.</span> OrderSathi does not read personal WhatsApp chats. Paste messages or upload files. Official WhatsApp Business
            API integration is not configured.
          </p>
        </div>
      </Card>
    </div>
  );
}
