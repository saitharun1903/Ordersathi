"use client";
import * as React from "react";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Pill } from "@/components/ui/status";
import { Spinner } from "@/components/ui/spinner";
import { commitImportAction, validateImportAction } from "@/server/actions/catalogue";
import type { ImportRow, RowResult } from "@/server/catalogue/service";
import { cn, pluralize } from "@/lib/utils";
import type { ImportField } from "./types";

const MAX_ROWS = 2000;
const MAX_BYTES = 5 * 1024 * 1024;

type Parsed = { name: string; headers: string[]; rows: Record<string, string>[] };
type Step = 1 | 2 | 3 | 4;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const SYNONYMS: Record<string, string[]> = {
  sku: ["sku", "code", "itemcode", "productcode", "partno", "partnumber", "skucode"],
  name: ["name", "productname", "itemname", "description", "item", "product"],
  category: ["category", "productcategory", "group", "itemgroup"],
  brand: ["brand", "make", "manufacturer", "company"],
  specs: ["specs", "specifications", "spec", "specification"],
  selling_unit: ["sellingunit", "unit", "uom", "units", "saleunit"],
  price: ["price", "rate", "sellingprice", "priceinr", "pricers", "mrp", "unitprice"],
  aliases_en: ["aliasesen", "englishaliases", "aliases", "alias", "aliasen"],
  aliases_te: ["aliaseste", "telugualiases", "telugu", "aliaste"],
  aliases_translit: ["aliasestranslit", "transliteratedaliases", "translit", "transliterated", "aliastranslit"],
  conversions: ["conversions", "conversion", "unitconversions", "packing"],
};

function autoMap(fields: ImportField[], headers: string[]) {
  const used = new Set<string>();
  const out: Record<string, string> = {};
  for (const f of fields) {
    const candidates = new Set([norm(f.key), norm(f.label), ...(SYNONYMS[f.key] ?? [])]);
    const hit = headers.find((h) => !used.has(h) && candidates.has(norm(h)));
    out[f.key] = hit ?? "";
    if (hit) used.add(hit);
  }
  return out;
}

const STEPS = ["Choose file", "Map columns", "Review", "Import"] as const;

export function ImportWizard({ fields }: { fields: ImportField[] }) {
  const [step, setStep] = React.useState<Step>(1);
  const [file, setFile] = React.useState<Parsed | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [results, setResults] = React.useState<RowResult[] | null>(null);
  const [validating, setValidating] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ created: number; updated: number; skipped: number } | null>(null);

  const rows: ImportRow[] = React.useMemo(() => {
    if (!file) return [];
    return file.rows.map((r) => {
      const o: Record<string, string> = {};
      for (const f of fields) {
        const col = mapping[f.key];
        if (col) o[f.key] = String(r[col] ?? "").trim();
      }
      return o as ImportRow;
    });
  }, [file, mapping, fields]);

  function handleFile(f: File | undefined) {
    if (!f) return;
    setParseError(null);
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      setParseError("Please choose a .csv file. In Excel, use File → Save As → CSV UTF-8.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setParseError("This file is larger than 5 MB. Split it into smaller files and import them one at a time.");
      return;
    }
    setParsing(true);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^﻿/, "").trim(),
      complete: (res) => {
        setParsing(false);
        const headers = (res.meta.fields ?? []).filter(Boolean);
        if (!headers.length || !res.data.length) {
          setParseError("We couldn't find any rows in this file. Make sure the first row has column names.");
          return;
        }
        if (res.data.length > MAX_ROWS) {
          setParseError(`This file has ${res.data.length.toLocaleString("en-IN")} rows. Import up to ${MAX_ROWS.toLocaleString("en-IN")} rows at a time — split the file and import each part.`);
          return;
        }
        setFile({ name: f.name, headers, rows: res.data });
        setMapping(autoMap(fields, headers));
        setResults(null);
        setDone(null);
        setStep(2);
      },
      error: () => {
        setParsing(false);
        setParseError("We couldn't read this file. Check that it's a valid CSV and try again.");
      },
    });
  }

  const missingRequired = fields.filter((f) => f.required && !mapping[f.key]);

  async function validate() {
    setValidating(true);
    setServerError(null);
    try {
      const r = await validateImportAction(rows);
      if (!r.ok) {
        setServerError(r.message);
        toast.error(r.message);
        return;
      }
      setResults(r.data);
      setStep(3);
    } catch {
      const m = "Couldn't reach the server. Your file is still loaded — try again.";
      setServerError(m);
      toast.error(m);
    } finally {
      setValidating(false);
    }
  }

  async function commit() {
    setCommitting(true);
    setServerError(null);
    try {
      const r = await commitImportAction(rows);
      if (!r.ok) {
        setServerError(r.message);
        toast.error(r.message);
        return;
      }
      setDone(r.data);
      setStep(4);
      toast.success("Catalogue imported");
    } catch {
      const m = "Couldn't reach the server. Nothing was imported — your file is still loaded, try again.";
      setServerError(m);
      toast.error(m);
    } finally {
      setCommitting(false);
    }
  }

  function reset() {
    setFile(null);
    setMapping({});
    setResults(null);
    setDone(null);
    setServerError(null);
    setParseError(null);
    setStep(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <Stepper step={step} />
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{serverError}</span>
        </div>
      )}
      {step === 1 && <ChooseFile onFile={handleFile} parsing={parsing} error={parseError} />}
      {step === 2 && file && (
        <MapColumns
          file={file}
          fields={fields}
          mapping={mapping}
          setMapping={setMapping}
          missing={missingRequired}
          onBack={reset}
          onNext={validate}
          validating={validating}
        />
      )}
      {step === 3 && file && results && (
        <Review
          rows={rows}
          results={results}
          onBack={() => setStep(2)}
          onCommit={commit}
          committing={committing}
        />
      )}
      {step === 4 && done && <Done result={done} onAgain={reset} />}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" aria-label="Import progress">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold tnum",
                state === "done" && "border-brand bg-brand text-white",
                state === "current" && "border-brand bg-brand-soft text-brand-ink",
                state === "todo" && "border-line-strong bg-surface text-faint",
              )}
            >
              {state === "done" ? <Check className="size-3.5" aria-hidden /> : n}
            </span>
            <span className={cn(state === "todo" ? "text-muted" : "font-medium text-ink")}>
              {label}
              {state === "done" && <span className="sr-only"> (completed)</span>}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line-strong" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function ChooseFile({ onFile, parsing, error }: { onFile: (f: File | undefined) => void; parsing: boolean; error: string | null }) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <Card>
      <CardHeader
        title="Choose a CSV file"
        description="One product per row. Existing SKUs are updated; new SKUs are added."
        actions={
          <Button asChild variant="ghost" size="sm">
            <a href="/api/catalogue/template" download>
              <Download /> Template
            </a>
          </Button>
        }
      />
      <div className="p-4 sm:p-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
            over ? "border-brand bg-brand-soft" : "border-line-strong bg-surface-2",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-surface text-muted shadow-[var(--shadow-card)]">
            {parsing ? <Spinner className="size-5" /> : <FileSpreadsheet className="size-5" aria-hidden />}
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{parsing ? "Reading file…" : "Drag a CSV file here"}</p>
            <p className="mt-0.5 text-[13px] text-muted">Up to 2,000 rows. Save from Excel as “CSV UTF-8” to keep Telugu text.</p>
          </div>
          <input
            ref={inputRef}
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="primary" size="sm" loading={parsing} onClick={() => inputRef.current?.click()}>
            <Upload /> Choose file
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-bad">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <details className="mt-4 text-[13px] text-muted">
          <summary className="cursor-pointer font-medium text-ink-2">Column format</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>
              <b className="font-medium text-ink-2">specs</b>: <code className="font-mono text-xs">rating=6A;colour=White</code>
            </li>
            <li>
              <b className="font-medium text-ink-2">aliases</b>: separate with <code className="font-mono text-xs">|</code>, e.g.{" "}
              <code className="font-mono text-xs">erra wire|red wire</code>
            </li>
            <li>
              <b className="font-medium text-ink-2">conversions</b>: <code className="font-mono text-xs">BOX=20</code> means 1 box = 20 selling units
            </li>
            <li>
              <b className="font-medium text-ink-2">selling_unit</b>: PIECE, BOX, ROLL, COIL, METRE, PACKET, SET or KG
            </li>
          </ul>
        </details>
      </div>
    </Card>
  );
}

function MapColumns({
  file,
  fields,
  mapping,
  setMapping,
  missing,
  onBack,
  onNext,
  validating,
}: {
  file: Parsed;
  fields: ImportField[];
  mapping: Record<string, string>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  missing: ImportField[];
  onBack: () => void;
  onNext: () => void;
  validating: boolean;
}) {
  const sample = file.rows[0] ?? {};
  return (
    <Card>
      <CardHeader
        title="Match your columns"
        description={
          <>
            <span className="font-medium text-ink-2">{file.name}</span> · {pluralize(file.rows.length, "row")} · {pluralize(file.headers.length, "column")}
          </>
        }
      />
      <div className="divide-y divide-line">
        {fields.map((f) => {
          const id = `map-${f.key}`;
          const col = mapping[f.key];
          const isMissing = f.required && !col;
          return (
            <div key={f.key} className="grid grid-cols-1 items-center gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <label htmlFor={id} className="text-[13px] font-medium text-ink">
                {f.label}
                {f.required ? (
                  <span className="ml-1 text-bad" aria-hidden>
                    *
                  </span>
                ) : (
                  <span className="ml-1.5 text-xs font-normal text-faint">optional</span>
                )}
                {f.required && <span className="sr-only"> (required)</span>}
              </label>
              <Select
                id={id}
                value={col ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                aria-invalid={isMissing || undefined}
                className="text-[13px]"
              >
                <option value="">— Not mapped —</option>
                {file.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
              <div className="min-w-0 truncate text-xs text-muted" title={col ? sample[col] : undefined}>
                {col ? (
                  sample[col] ? (
                    <>
                      <span className="text-faint">e.g. </span>
                      <span className="text-ink-2">{sample[col]}</span>
                    </>
                  ) : (
                    <span className="text-faint">First row is empty</span>
                  )
                ) : isMissing ? (
                  <span className="text-bad">Required</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-xl sm:px-5">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={validating}>
          <ArrowLeft /> Choose another file
        </Button>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {missing.length > 0 && (
            <p className="text-xs text-bad" role="status">
              Map {missing.map((m) => m.label).join(", ")} to continue
            </p>
          )}
          <Button type="button" variant="primary" size="sm" onClick={onNext} loading={validating} disabled={missing.length > 0}>
            {validating ? "Checking rows…" : "Check rows"}
            {!validating && <ArrowRight />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

const STATUS = {
  create: { label: "New", tone: "ok" as const },
  update: { label: "Update", tone: "info" as const },
  error: { label: "Error", tone: "bad" as const },
};

function Review({
  rows,
  results,
  onBack,
  onCommit,
  committing,
}: {
  rows: ImportRow[];
  results: RowResult[];
  onBack: () => void;
  onCommit: () => void;
  committing: boolean;
}) {
  const [errorsOnly, setErrorsOnly] = React.useState(false);
  const counts = { create: 0, update: 0, error: 0 };
  for (const r of results) counts[r.action]++;
  const valid = counts.create + counts.update;
  const shown = errorsOnly ? results.filter((r) => r.action === "error") : results;

  return (
    <Card>
      <CardHeader
        title="Review before importing"
        description={counts.error > 0 ? "Rows with errors will be skipped. Fix them in your file and import again, or continue without them." : "All rows look good."}
      />
      <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
        <Stat label="New products" value={counts.create} tone="ok" />
        <Stat label="Updates" value={counts.update} tone="info" />
        <Stat label="Errors (skipped)" value={counts.error} tone={counts.error ? "bad" : "muted"} />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <label className="inline-flex items-center gap-2 text-[13px] text-ink-2">
          <input
            type="checkbox"
            checked={errorsOnly}
            onChange={(e) => setErrorsOnly(e.target.checked)}
            disabled={counts.error === 0}
            className="size-4 rounded border-line-strong accent-[var(--color-brand)]"
          />
          Show errors only
        </label>
        <span className="text-xs text-muted tnum">{pluralize(shown.length, "row")}</span>
      </div>
      <div className="max-h-[55vh] overflow-auto border-t border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="w-14 px-4 py-2 font-medium sm:px-5">Row</th>
              <th scope="col" className="px-3 py-2 font-medium">SKU</th>
              <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Name</th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Price</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const src = rows[r.row - 1] ?? {};
              const s = STATUS[r.action];
              return (
                <tr key={r.row} className={cn("border-b border-line align-top last:border-b-0", r.action === "error" && "bg-bad-soft/40")}>
                  {/* +1 because row 1 of the file is the header */}
                  <td className="tnum px-4 py-2 text-muted sm:px-5">{r.row + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-2">{r.sku || <span className="font-sans text-faint">(blank)</span>}</td>
                  <td className="hidden max-w-80 truncate px-3 py-2 text-ink sm:table-cell">{src.name}</td>
                  <td className="tnum hidden whitespace-nowrap px-3 py-2 text-right text-ink-2 sm:table-cell">{src.price ? `₹${src.price}` : ""}</td>
                  <td className="px-3 py-2">
                    <Pill tone={s.tone}>{s.label}</Pill>
                    {r.errors.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-0.5 text-xs text-bad">
                        {r.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-xl sm:px-5">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={committing}>
          <ArrowLeft /> Back to columns
        </Button>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {valid === 0 && <p className="text-xs text-bad">No valid rows to import.</p>}
          <Button type="button" variant="primary" size="sm" onClick={onCommit} loading={committing} disabled={valid === 0}>
            {committing ? `Importing ${pluralize(valid, "product")}…` : `Import ${pluralize(valid, "product")}`}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "info" | "bad" | "muted" }) {
  const color = { ok: "text-ok", info: "text-info", bad: "text-bad", muted: "text-faint" }[tone];
  return (
    <div className="px-4 py-3 sm:px-5">
      <div className={cn("tnum text-xl font-semibold", color)}>{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Done({ result, onAgain }: { result: { created: number; updated: number; skipped: number }; onAgain: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center px-6 py-12 text-center" role="status">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-ok-soft text-ok">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-ink">Import complete</h2>
        <p className="mt-1 text-sm text-muted">
          {pluralize(result.created, "product")} added · {pluralize(result.updated, "product")} updated
          {result.skipped > 0 && <> · {pluralize(result.skipped, "row")} skipped</>}
        </p>
        {result.updated > 0 && <p className="mt-1 text-xs text-muted">Open orders using updated products were re-checked for price changes.</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild variant="primary" size="sm">
            <Link href="/catalogue">View catalogue</Link>
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onAgain}>
            <RefreshCw /> Import another file
          </Button>
        </div>
      </div>
    </Card>
  );
}
