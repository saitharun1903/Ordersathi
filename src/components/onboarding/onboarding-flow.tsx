"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessStep, CatalogueStep, ChooseStep, CustomerStep, FinishStep } from "./steps";

const STEPS = [
  { n: 1, label: "Business" },
  { n: 2, label: "Catalogue" },
  { n: 3, label: "Customer" },
  { n: 4, label: "First order" },
] as const;

export function OnboardingFlow({ initialStep, userName, workspaceName }: { initialStep: number; userName: string; workspaceName: string | null }) {
  const [step, setStep] = React.useState(initialStep);
  const [businessName, setBusinessName] = React.useState(workspaceName);
  const headingRef = React.useRef<HTMLDivElement>(null);
  const first = React.useRef(true);

  // Move focus to the new step for keyboard and screen-reader users.
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const firstName = userName.split(" ")[0] || userName;

  return (
    <div>
      {step === 0 ? (
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <ChooseStep firstName={firstName} onSetup={() => setStep(1)} />
        </div>
      ) : (
        <>
          <Progress step={step} />
          <div ref={headingRef} tabIndex={-1} className="mt-8 outline-none">
            {step === 1 && (
              <BusinessStep
                onBack={initialStep === 0 ? () => setStep(0) : undefined}
                onDone={(name) => {
                  setBusinessName(name);
                  setStep(2);
                }}
              />
            )}
            {step === 2 && <CatalogueStep businessName={businessName} onDone={() => setStep(3)} />}
            {step === 3 && <CustomerStep onBack={() => setStep(2)} onDone={() => setStep(4)} />}
            {step === 4 && <FinishStep onBack={() => setStep(3)} />}
          </div>
        </>
      )}
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <nav aria-label="Setup progress">
      <p className="mb-3 text-xs font-medium text-muted sm:hidden">
        Step {step} of {STEPS.length} · {STEPS[step - 1]?.label}
      </p>
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const current = s.n === step;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tnum",
                  done && "border-brand bg-brand text-white",
                  current && "border-brand bg-brand-soft text-brand-ink",
                  !done && !current && "border-line-strong bg-surface text-muted",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : s.n}
              </span>
              <span className={cn("hidden whitespace-nowrap text-[13px] sm:inline", current ? "font-semibold text-ink" : done ? "text-ink-2" : "text-muted")}>
                {s.label}
                <span className="sr-only">{done ? " (done)" : current ? " (current)" : ""}</span>
              </span>
              <span className="sr-only sm:hidden">
                {s.label}
                {done ? " (done)" : current ? " (current)" : ""}
              </span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-brand" : "bg-line-strong")} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
