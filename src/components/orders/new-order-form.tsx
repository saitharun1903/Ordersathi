"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, Check, FileAudio, ImageIcon, Info, Mic, MessageSquareText, RotateCcw, Sparkles, Square, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type Customer = { id: string; name: string; city: string | null; preferredLanguage: string };
type Sample = { id: string; kind: "AUDIO" | "IMAGE"; file: string; title: string; description: string };
type Mode = "TEXT" | "AUDIO" | "IMAGE";
type Phase =
  | { name: "idle" }
  | { name: "uploading"; progress: number }
  | { name: "processing"; stage: string; orderId: string; jobId: string }
  | { name: "error"; message: string; orderId?: string };

const STAGES: { key: string; label: (m: Mode) => string }[] = [
  { key: "STORED", label: () => "Saved securely" },
  { key: "TRANSCRIBING", label: (m) => (m === "AUDIO" ? "Transcribing voice note" : m === "IMAGE" ? "Reading the photo" : "Reading message") },
  { key: "EXTRACTING", label: () => "Extracting items" },
  { key: "MATCHING", label: () => "Matching your catalogue" },
  { key: "PRICING", label: () => "Pricing & checking" },
  { key: "SAVED", label: () => "Draft ready" },
];

const TEXT_EXAMPLES = [
  "Send ten switches, five sockets and two rolls of wire.",
  "Anchor Roma 6A 1 way switch 20\nHavells 16A socket 10\nPolycab 2.5 sq mm red wire 3 rolls",
  "రెండు చుట్టలు పాలీక్యాబ్ 1.5 ఎర్ర వైరు, పది ఆంకర్ 6A స్విచ్‌లు",
];

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function NewOrderForm({
  customers,
  initialCustomerId,
  audioLive,
  imageLive,
  extractionLabel,
  samples,
}: {
  customers: Customer[];
  initialCustomerId: string | null;
  audioLive: boolean;
  imageLive: boolean;
  extractionLabel: string;
  samples: Sample[];
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("TEXT");
  const [customerId, setCustomerId] = React.useState(initialCustomerId ?? "");
  const [language, setLanguage] = React.useState<"AUTO" | "EN" | "TE">("AUTO");
  const [text, setText] = React.useState("");
  const [audio, setAudio] = React.useState<File | null>(null);
  const [image, setImage] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>({ name: "idle" });
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const keyRef = React.useRef<string>("");
  if (!keyRef.current) keyRef.current = newKey();

  // A new submission (different content) gets a new idempotency key; retries reuse it.
  const contentSig = `${mode}|${customerId}|${language}|${text}|${audio?.name}${audio?.size}|${image?.name}${image?.size}`;
  const lastSig = React.useRef(contentSig);
  React.useEffect(() => {
    if (lastSig.current !== contentSig && phase.name !== "uploading" && phase.name !== "processing") {
      keyRef.current = newKey();
      lastSig.current = contentSig;
    }
  }, [contentSig, phase.name]);

  const chooseCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c && c.preferredLanguage !== "AUTO") setLanguage(c.preferredLanguage as "EN" | "TE");
  };

  const busy = phase.name === "uploading" || phase.name === "processing";
  const file = mode === "AUDIO" ? audio : mode === "IMAGE" ? image : null;
  const ready = mode === "TEXT" ? text.trim().length > 0 : !!file;

  async function poll(orderId: string, jobId: string) {
    const started = Date.now();
    for (;;) {
      await new Promise((r) => setTimeout(r, 700));
      let data: { status: string; stage: string } | null = null;
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const json = await res.json();
        if (json.ok) data = json.data;
      } catch {
        // transient network error — keep polling
      }
      if (data) {
        setPhase({ name: "processing", stage: data.stage, orderId, jobId });
        if (data.status === "SUCCEEDED" || data.status === "FAILED") break;
      }
      if (Date.now() - started > 120_000) break;
    }
    router.push(`/orders/${orderId}`);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!ready) {
      setFieldError(mode === "TEXT" ? "Paste or type the order message." : mode === "AUDIO" ? "Record or attach a voice note." : "Attach a photo of the list.");
      return;
    }
    setFieldError(null);
    const fd = new FormData();
    fd.set("idempotencyKey", keyRef.current);
    fd.set("inputType", mode);
    fd.set("inputLanguage", language);
    if (customerId) fd.set("customerId", customerId);
    if (mode === "TEXT") fd.set("text", text);
    if (file) fd.set("file", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/orders/intake");
    xhr.responseType = "json";
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setPhase({ name: "uploading", progress: Math.round((ev.loaded / ev.total) * 100) });
    };
    xhr.onerror = () => setPhase({ name: "error", message: "Upload failed — check your connection. Your input is kept; press Retry." });
    xhr.onload = () => {
      const body = xhr.response as { ok: boolean; data?: { orderId: string; jobId: string | null }; message?: string; fieldErrors?: Record<string, string> } | null;
      if (!body?.ok || !body.data) {
        setPhase({ name: "error", message: body?.message ?? `Upload failed (${xhr.status}). Your input is kept; press Retry.` });
        return;
      }
      const { orderId, jobId } = body.data;
      if (!jobId) return router.push(`/orders/${orderId}`);
      setPhase({ name: "processing", stage: "STORED", orderId, jobId });
      void poll(orderId, jobId);
    };
    setPhase({ name: "uploading", progress: 0 });
    xhr.send(fd);
  }

  async function loadSample(s: Sample) {
    const res = await fetch(`/samples/${s.file}`);
    const blob = await res.blob();
    const f = new File([blob], s.file, { type: blob.type || (s.kind === "AUDIO" ? "audio/wav" : "image/png") });
    if (s.kind === "AUDIO") setAudio(f);
    else setImage(f);
    const match = s.id === "voice-sai-en" ? "Sai Electricals" : s.id === "photo-venkat-mixed" ? "Venkateswara" : null;
    const c = match ? customers.find((x) => x.name.startsWith(match)) : null;
    if (c) chooseCustomer(c.id);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Customer" htmlFor="customer" hint={customers.length ? "Customer-specific prices and wording apply." : "Add customers in the Customers tab."} optional>
            <Select id="customer" value={customerId} onChange={(e) => chooseCustomer(e.target.value)} disabled={busy}>
              <option value="">Choose later</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` — ${c.city}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2" id="lang-label">
              Input language
            </span>
            <div role="radiogroup" aria-labelledby="lang-label" className="inline-flex rounded-lg bg-sunken p-1">
              {(
                [
                  ["AUTO", "Auto-detect"],
                  ["EN", "English"],
                  ["TE", "తెలుగు"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={language === v}
                  disabled={busy}
                  onClick={() => setLanguage(v)}
                  className={cn("h-7 rounded-md px-3 text-[13px] font-medium transition-colors", language === v ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-muted hover:text-ink")}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div role="tablist" aria-label="Order input type" className="grid grid-cols-3 border-b border-line bg-surface-2">
          {(
            [
              ["TEXT", "Message", MessageSquareText],
              ["AUDIO", "Voice note", Mic],
              ["IMAGE", "Photo of list", ImageIcon],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={busy}
              onClick={() => {
                setMode(m);
                setFieldError(null);
              }}
              className={cn(
                "relative flex h-12 items-center justify-center gap-2 text-[13px] font-medium transition-colors",
                mode === m ? "bg-surface text-ink" : "text-muted hover:text-ink",
              )}
            >
              <Icon className={cn("size-4", mode === m && "text-brand")} />
              {label}
              {mode === m && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {mode === "TEXT" && (
            <div className="space-y-3">
              <label htmlFor="order-text" className="sr-only">
                Order message
              </label>
              <Textarea
                id="order-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
                aria-invalid={!!fieldError || undefined}
                aria-describedby={fieldError ? "input-error" : "text-hint"}
                placeholder={"Paste the WhatsApp message or type the order…\n\ne.g. Anchor 6A switch 20, Havells 16A socket 10, Polycab 2.5 sq mm red wire 3 rolls"}
                className="min-h-48 font-[450] sm:min-h-56"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
              />
              <div id="text-hint" className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>Try an example:</span>
                {TEXT_EXAMPLES.map((ex, i) => (
                  <button key={i} type="button" onClick={() => setText(ex)} disabled={busy} className="max-w-[16rem] truncate rounded-md border border-line bg-surface-2 px-2 py-1 text-left text-ink-2 hover:border-line-strong">
                    {ex.split("\n")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === "AUDIO" && <AudioInput file={audio} onFile={setAudio} disabled={busy} live={audioLive} samples={samples.filter((s) => s.kind === "AUDIO")} onSample={loadSample} />}
          {mode === "IMAGE" && <ImageInput file={image} onFile={setImage} disabled={busy} live={imageLive} samples={samples.filter((s) => s.kind === "IMAGE")} onSample={loadSample} />}
          {fieldError && (
            <p id="input-error" role="alert" className="mt-2 text-xs text-bad">
              {fieldError}
            </p>
          )}
        </div>
      </Card>

      <ProcessingPanel phase={phase} mode={mode} />

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Sparkles className="size-3.5" /> Text understanding: {extractionLabel}. Nothing is sent to the customer automatically.
        </p>
        <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {phase.name === "error" && phase.orderId && (
            <Button type="button" variant="secondary" onClick={() => router.push(`/orders/${phase.orderId}`)}>
              Open draft
            </Button>
          )}
          <Button type="submit" variant="primary" size="lg" loading={busy} disabled={busy} className="min-w-44">
            {phase.name === "error" ? (
              <>
                <RotateCcw /> Retry
              </>
            ) : busy ? (
              "Processing…"
            ) : (
              "Process order"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ProcessingPanel({ phase, mode }: { phase: Phase; mode: Mode }) {
  if (phase.name === "idle") return null;
  if (phase.name === "error") {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-xl border border-bad-line bg-bad-soft px-4 py-3 text-sm text-bad">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>{phase.message}</div>
      </div>
    );
  }
  const activeIdx = phase.name === "uploading" ? -1 : Math.max(0, STAGES.findIndex((s) => s.key === phase.stage));
  return (
    <Card className="animate-slide-up p-4 sm:p-5" aria-live="polite">
      {phase.name === "uploading" && (
        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="font-medium">Uploading</span>
            <span className="tnum text-muted">{phase.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${phase.progress}%` }} />
          </div>
        </div>
      )}
      <ol className="grid gap-2 sm:grid-cols-3">
        {STAGES.filter((s) => mode !== "TEXT" || s.key !== "TRANSCRIBING").map((s) => {
          const idx = STAGES.indexOf(s);
          const done = idx < activeIdx || (phase.name === "processing" && phase.stage === "SAVED");
          const active = idx === activeIdx && !done;
          return (
            <li key={s.key} className={cn("flex items-center gap-2 text-[13px]", done ? "text-ink" : active ? "font-medium text-ink" : "text-faint")}>
              <span className={cn("flex size-5 items-center justify-center rounded-full border", done ? "border-brand bg-brand text-white" : active ? "border-brand text-brand" : "border-line-strong")}>
                {done ? <Check className="size-3" /> : active ? <Spinner className="size-3" /> : null}
              </span>
              {s.label(mode)}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function DemoNote({ live, kind }: { live: boolean; kind: "AUDIO" | "IMAGE" }) {
  if (live) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warn-line bg-warn-soft px-3 py-2 text-xs text-warn">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Demo mode: {kind === "AUDIO" ? "voice transcription" : "photo reading"} needs a connected provider. Only the sample below can be read. Other files are still saved, and you can type the
        order into the transcript on the review screen.
      </span>
    </div>
  );
}

function SampleButtons({ samples, onSample, disabled }: { samples: Sample[]; onSample: (s: Sample) => void; disabled?: boolean }) {
  if (!samples.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {samples.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={disabled}
          onClick={() => onSample(s)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 py-2 text-left text-xs hover:border-brand hover:bg-brand-soft"
        >
          <Sparkles className="size-3.5 text-brand" />
          <span>
            <span className="block font-medium text-ink">Use sample: {s.title}</span>
            <span className="block text-muted">{s.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function DropZone({ accept, onFile, disabled, children, capture }: { accept: string; onFile: (f: File) => void; disabled?: boolean; children: React.ReactNode; capture?: boolean }) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn("rounded-xl border border-dashed px-4 py-6 text-center transition-colors", over ? "border-brand bg-brand-soft" : "border-line-strong bg-surface-2")}
    >
      {children}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Upload /> Choose file
        </Button>
        {capture && (
          <label className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] font-medium sm:hidden", disabled && "pointer-events-none opacity-50")}>
            <Camera className="size-4" /> Take photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

function AudioInput({ file, onFile, disabled, live, samples, onSample }: { file: File | null; onFile: (f: File | null) => void; disabled?: boolean; live: boolean; samples: Sample[]; onSample: (s: Sample) => void }) {
  // Only rendered client-side after the user picks the voice tab, so reading browser APIs here is safe.
  const [supported] = React.useState<boolean>(() => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
  const [recording, setRecording] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [micError, setMicError] = React.useState<string | null>(null);
  const recRef = React.useRef<MediaRecorder | null>(null);
  const url = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  React.useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  async function start() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onFile(new File(chunks, `voice-note-${Date.now()}.${ext}`, { type }));
        setRecording(false);
      };
      recRef.current = rec;
      setSeconds(0);
      rec.start();
      setRecording(true);
    } catch {
      setMicError("Microphone access was blocked or is unavailable. Upload an audio file instead.");
    }
  }

  return (
    <div className="space-y-3">
      <DemoNote live={live} kind="AUDIO" />
      {file && url ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3 sm:flex-row sm:items-center">
          <FileAudio className="hidden size-5 text-brand sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <audio controls src={url} className="h-9 w-full sm:w-64" />
          <Button type="button" size="sm" variant="ghost" onClick={() => onFile(null)} disabled={disabled}>
            <Trash2 /> Remove
          </Button>
        </div>
      ) : (
        <>
          {supported !== false && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-6">
              <button
                type="button"
                disabled={disabled}
                onClick={() => (recording ? recRef.current?.stop() : start())}
                aria-label={recording ? "Stop recording" : "Start recording"}
                className={cn(
                  "flex size-16 items-center justify-center rounded-full text-white shadow-[var(--shadow-pop)] transition-transform active:scale-95",
                  recording ? "bg-bad" : "bg-brand hover:bg-brand-hover",
                )}
              >
                {recording ? <Square className="size-6 fill-current" /> : <Mic className="size-7" />}
              </button>
              <p className="text-[13px] font-medium" aria-live="polite">
                {recording ? (
                  <span className="text-bad">
                    <span className="mr-1.5 inline-block size-2 animate-pulse-soft rounded-full bg-bad" />
                    Recording… {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                  </span>
                ) : (
                  "Tap to record the order"
                )}
              </p>
              {micError && <p className="text-xs text-bad">{micError}</p>}
            </div>
          )}
          {supported === false && (
            <p className="rounded-lg bg-sunken px-3 py-2 text-xs text-ink-2">Recording isn’t supported in this browser. Upload the voice note file instead.</p>
          )}
          <DropZone accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.webm,.aac" onFile={onFile} disabled={disabled || recording}>
            <p className="text-[13px] font-medium">Or upload a voice note</p>
            <p className="mt-0.5 text-xs text-muted">MP3, M4A, WAV, OGG, OPUS or WebM · forwarded WhatsApp voice notes work</p>
          </DropZone>
          <SampleButtons samples={samples} onSample={onSample} disabled={disabled} />
        </>
      )}
    </div>
  );
}

function ImageInput({ file, onFile, disabled, live, samples, onSample }: { file: File | null; onFile: (f: File | null) => void; disabled?: boolean; live: boolean; samples: Sample[]; onSample: (s: Sample) => void }) {
  const url = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return (
    <div className="space-y-3">
      <DemoNote live={live} kind="IMAGE" />
      {file && url ? (
        <div className="relative overflow-hidden rounded-xl border border-line bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Selected order list" className="mx-auto max-h-80 object-contain" />
          <div className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2">
            <span className="truncate text-xs text-muted">{file.name}</span>
            <Button type="button" size="xs" variant="ghost" onClick={() => onFile(null)} disabled={disabled}>
              <X /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <>
          <DropZone accept="image/jpeg,image/png,image/webp" onFile={onFile} disabled={disabled} capture>
            <ImageIcon className="mx-auto mb-2 size-6 text-muted" />
            <p className="text-[13px] font-medium">Drop a photo of the handwritten or printed list</p>
            <p className="mt-0.5 text-xs text-muted">JPG, PNG or WebP · up to 10 MB</p>
          </DropZone>
          <SampleButtons samples={samples} onSample={onSample} disabled={disabled} />
        </>
      )}
    </div>
  );
}
