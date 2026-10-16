import { Pill } from "@/components/ui/status";

export function LanguagePill({ lang }: { lang: string }) {
  if (lang === "TE") return <Pill tone="brand">Telugu</Pill>;
  if (lang === "EN") return <Pill tone="info">English</Pill>;
  return <Pill>Auto-detect</Pill>;
}
