// Serializable shapes passed from server pages to catalogue client components.

export type AliasLang = "EN" | "TE" | "TRANSLIT";

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  specs: Record<string, string>;
  sellingUnit: string;
  pricePaise: number;
  archived: boolean;
  aliases: { id: string; text: string; language: AliasLang }[];
  conversions: { unit: string; factor: string }[];
};

export type ImportField = { key: string; label: string; required: boolean };

export const ALIAS_LANGS: { value: AliasLang; label: string; short: string }[] = [
  { value: "EN", label: "English", short: "EN" },
  { value: "TE", label: "Telugu", short: "TE" },
  { value: "TRANSLIT", label: "Transliterated", short: "Translit" },
];

export const aliasLangLabel = (l: string) => ALIAS_LANGS.find((x) => x.value === l)?.label ?? l;
