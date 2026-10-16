// Deterministic catalogue matcher. Ranks products using aliases, product type,
// brand and specification tokens. When a request leaves a differentiating
// attribute unspecified, it returns candidates plus a precise explanation
// instead of picking a variant.

import { normalizeSpecValue, normalizeText, tokens } from "@/lib/normalize";

export type CatalogueProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  specs: Record<string, string>;
  sellingUnit: string;
  conversionUnits: string[];
  aliases: { normalized: string; customerId: string | null }[];
};

export type AmbiguityDim = { key: string; label: string; options: string[] };
export type MatchNote =
  | { kind: "ambiguous"; dims: AmbiguityDim[]; noun: string }
  | { kind: "unavailable"; label: string; requested: string; available: string[]; noun: string }
  | { kind: "ai-suggested" }
  | { kind: "no-match" };

export type MatchResult = {
  productId: string | null;
  candidates: { productId: string; reason: string }[];
  method: "customer-alias" | "alias" | "rules" | "ai-suggested" | "none";
  note: MatchNote | null;
};

export type MatchInput = {
  description: string; // already normalized by the parser or AI
  originalText: string;
  brand?: string | null;
  specs?: Record<string, string>;
  requestedUnit?: string | null;
  customerId?: string | null;
  aiSuggestedProductIds?: string[]; // already validated against the workspace
};

const COLOURS = new Set(["red", "black", "blue", "green", "yellow", "white", "brown", "gray", "ivory", "silver", "grey"]);
const CLASS_LABEL: Record<string, string> = {
  rating: "Rating",
  size: "Wire size",
  wattage: "Wattage",
  way: "Switch type",
  modules: "Module size",
  cores: "Cores",
  pins: "Pins",
  mm: "Size",
  length: "Length",
  feet: "Length",
  gauge: "Gauge",
  colour: "Colour",
  poles: "Poles",
  cap: "Cap type",
  brand: "Brand",
};
const STOP = new Set(["led", "pvc", "fr", "the", "of", "type", "new", "good", "quality", "item", "items", "light"]);

export function specClass(v: string): string | null {
  const n = normalizeSpecValue(v);
  if (/^\d+(\.\d+)?a$/.test(n)) return "rating";
  if (/^\d+(\.\d+)?sqmm$/.test(n)) return "size";
  if (/^\d+(\.\d+)?w$/.test(n)) return "wattage";
  if (/^\d+way$/.test(n)) return "way";
  if (/^\d+module$/.test(n)) return "modules";
  if (/^\d+core$/.test(n)) return "cores";
  if (/^\d+pin$/.test(n)) return "pins";
  if (/^\d+(\.\d+)?mm$/.test(n)) return "mm";
  if (/^\d+(\.\d+)?m$/.test(n)) return "length";
  if (/^\d+ft$/.test(n)) return "feet";
  if (/^\d+swg$/.test(n)) return "gauge";
  if (COLOURS.has(n)) return "colour";
  if (/^(sp|dp|tp|tpn|spn|fp)$/.test(n)) return "poles";
  if (/^(b22|e27)$/.test(n)) return "cap";
  return null;
}

type Prepared = {
  p: CatalogueProduct;
  head: string;
  typeToks: string[];
  nameToks: Set<string>;
  brand: string | null;
  specByClass: Map<string, { norm: string; display: string }>;
};

const cache = new WeakMap<CatalogueProduct[], Prepared[]>();

function prepare(catalogue: CatalogueProduct[]): Prepared[] {
  const hit = cache.get(catalogue);
  if (hit) return hit;
  const out = catalogue.map((p) => {
    const typeToks = tokens(p.category);
    const specByClass = new Map<string, { norm: string; display: string }>();
    for (const value of Object.values(p.specs)) {
      const cls = specClass(value);
      if (cls) specByClass.set(cls, { norm: normalizeSpecValue(value), display: value });
    }
    return {
      p,
      head: typeToks[typeToks.length - 1] ?? "",
      typeToks,
      nameToks: new Set([...tokens(p.name), ...typeToks]),
      brand: p.brand ? normalizeText(p.brand) : null,
      specByClass,
    };
  });
  cache.set(catalogue, out);
  return out;
}

function containsPhrase(hay: string[], phrase: string) {
  const needle = phrase.split(" ").filter(Boolean);
  if (!needle.length || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((t, k) => hay[i + k] === t)) return true;
  }
  return false;
}

function typeScore(pp: Prepared, toks: Set<string>) {
  if (!pp.typeToks.length) return 0;
  const headHit = toks.has(pp.head) ? 1 : 0;
  const others = pp.typeToks.slice(0, -1);
  const otherHits = others.filter((t) => toks.has(t)).length;
  const all = headHit && otherHits === others.length ? 0.5 : 0;
  return headHit + (others.length ? (0.5 * otherHits) / others.length : 0) + all + 0.1 * otherHits;
}

function joinOptions(opts: string[]) {
  if (opts.length <= 1) return opts.join("");
  if (opts.length === 2) return `${opts[0]} and ${opts[1]}`;
  return `${opts.slice(0, -1).join(", ")} and ${opts[opts.length - 1]}`;
}

export function describeNote(note: MatchNote | null): string[] {
  if (!note) return [];
  switch (note.kind) {
    case "ambiguous":
      return note.dims.map((d) =>
        d.options.length === 2
          ? `${d.label} not specified — both ${joinOptions(d.options)} ${plural(note.noun)} match`
          : `${d.label} not specified — ${joinOptions(d.options)} ${plural(note.noun)} match`,
      );
    case "unavailable":
      return [
        `No ${note.requested} ${note.noun} in the catalogue — available: ${note.available.join(", ") || "none"}`,
      ];
    case "ai-suggested":
      return ["Suggested match from the wording — confirm the product"];
    case "no-match":
      return ["No catalogue product matches this wording"];
  }
}

export function matchLine(input: MatchInput, catalogue: CatalogueProduct[]): MatchResult {
  const all = prepare(catalogue);
  const descToks = tokens(input.description);
  const extraSpecToks = Object.values(input.specs ?? {}).map(normalizeSpecValue);
  const toks = new Set([...descToks, ...extraSpecToks]);
  const descSeq = [...descToks];

  // Mentioned brand: explicit (AI-extracted) or any catalogue brand appearing in the text.
  const brands = [...new Set(all.map((x) => x.brand).filter((b): b is string => !!b))];
  let brand: string | null = input.brand ? normalizeText(input.brand) : null;
  if (brand && !brands.includes(brand)) {
    brand = brands.find((b) => b.startsWith(brand!) || brand!.startsWith(b)) ?? brand;
  }
  if (!brand) brand = brands.find((b) => containsPhrase(descSeq, b)) ?? null;

  // Mentioned specs by class.
  const mentioned = new Map<string, string>();
  for (const t of toks) {
    const cls = specClass(t);
    if (cls && !mentioned.has(cls)) mentioned.set(cls, t);
  }

  // 1. Alias matches (customer-specific first).
  const aliasHits: { pp: Prepared; customer: boolean }[] = [];
  for (const pp of all) {
    for (const a of pp.p.aliases) {
      if (a.customerId && a.customerId !== input.customerId) continue;
      if (containsPhrase(descSeq, a.normalized)) {
        aliasHits.push({ pp, customer: !!a.customerId });
        break;
      }
    }
  }
  const customerAlias = aliasHits.filter((h) => h.customer);
  if (customerAlias.length === 1) {
    return {
      productId: customerAlias[0].pp.p.id,
      candidates: [{ productId: customerAlias[0].pp.p.id, reason: "Customer's saved wording" }],
      method: "customer-alias",
      note: null,
    };
  }

  // 2. Type-based inclusion.
  let scored = all
    .map((pp) => ({ pp, ts: typeScore(pp, toks), alias: aliasHits.some((h) => h.pp === pp) }))
    .filter((x) => x.ts >= 1 || x.alias);

  // No product noun ("4 sq mm red polycab"): infer the type from an exact spec match.
  if (!scored.length && mentioned.size) {
    scored = all
      .filter((pp) => (!brand || pp.brand === brand) && [...mentioned].some(([cls, v]) => pp.specByClass.get(cls)?.norm === v))
      .map((pp) => ({ pp, ts: 1, alias: false }));
  }

  if (!scored.length) {
    const ai = (input.aiSuggestedProductIds ?? []).filter((id) => all.some((x) => x.p.id === id));
    if (ai.length) {
      return {
        productId: null,
        candidates: ai.slice(0, 6).map((id) => ({ productId: id, reason: "Suggested from wording" })),
        method: "ai-suggested",
        note: { kind: "ai-suggested" },
      };
    }
    return { productId: null, candidates: [], method: "none", note: { kind: "no-match" } };
  }

  let pool: typeof scored;
  if (aliasHits.length) pool = scored.filter((x) => x.alias);
  else {
    const maxTs = Math.max(...scored.map((x) => x.ts));
    pool = scored.filter((x) => x.ts === maxTs);
  }
  const noun = nounFor(pool.map((x) => x.pp));

  // 3. Unit compatibility: prefer products that can be sold in the requested unit.
  if (input.requestedUnit) {
    const compatible = pool.filter(
      (x) => x.pp.p.sellingUnit === input.requestedUnit || x.pp.p.conversionUnits.includes(input.requestedUnit!),
    );
    if (compatible.length && compatible.length < pool.length) pool = compatible;
  }

  // 4. Hard constraints: brand and specs must not conflict.
  const beforeConstraints = pool;
  if (brand) {
    const b = pool.filter((x) => x.pp.brand === brand);
    if (!b.length) {
      return unavailable(beforeConstraints, "Brand", titleCase(brand), [...new Set(beforeConstraints.map((x) => x.pp.p.brand ?? "Unbranded"))], noun);
    }
    pool = b;
  }
  for (const [cls, value] of mentioned) {
    const relevant = pool.filter((x) => x.pp.specByClass.has(cls));
    if (!relevant.length) continue; // attribute does not apply to these products
    const ok = pool.filter((x) => !x.pp.specByClass.has(cls) || x.pp.specByClass.get(cls)!.norm === value);
    const exact = ok.filter((x) => x.pp.specByClass.get(cls)?.norm === value);
    if (!exact.length) {
      const available = uniq(relevant.map((x) => x.pp.specByClass.get(cls)!.display));
      return unavailable(pool, CLASS_LABEL[cls] ?? cls, displaySpec(value), available, noun);
    }
    pool = exact;
  }

  // 5. Distinctive name tokens (series names like "Roma", "Lifeline").
  for (const t of descToks) {
    if (STOP.has(t) || t.length < 3 || specClass(t)) continue;
    const has = pool.filter((x) => x.pp.nameToks.has(t));
    if (has.length && has.length < pool.length) pool = has;
  }

  // 6. Rank.
  const ranked = pool
    .map((x) => {
      let score = (x.alias ? 10 : 0) + x.ts * 10;
      for (const t of descToks) if (x.pp.nameToks.has(t)) score += 2;
      const ai = input.aiSuggestedProductIds?.includes(x.pp.p.id) ? 1 : 0;
      return { ...x, score: score + ai };
    })
    .sort((a, b) => b.score - a.score || a.pp.p.name.localeCompare(b.pp.p.name));

  if (ranked.length === 1) {
    const only = ranked[0];
    return {
      productId: only.pp.p.id,
      candidates: [{ productId: only.pp.p.id, reason: only.alias ? "Saved catalogue wording" : "All stated details match" }],
      method: only.alias ? "alias" : "rules",
      note: null,
    };
  }

  // 7. Ambiguous — explain which attributes differ.
  const dims: AmbiguityDim[] = [];
  const brandsInPool = uniq(ranked.map((x) => x.pp.p.brand ?? "Unbranded"));
  if (brandsInPool.length > 1) dims.push({ key: "brand", label: "Brand", options: brandsInPool });
  const classes = new Set(ranked.flatMap((x) => [...x.pp.specByClass.keys()]));
  for (const cls of classes) {
    if (mentioned.has(cls)) continue;
    const vals = uniq(ranked.map((x) => x.pp.specByClass.get(cls)?.display).filter((v): v is string => !!v));
    if (vals.length > 1) dims.push({ key: cls, label: CLASS_LABEL[cls] ?? cls, options: sortSpecs(vals) });
  }
  if (!dims.length) dims.push({ key: "product", label: "Variant", options: ranked.slice(0, 4).map((x) => x.pp.p.name) });

  return {
    productId: null,
    candidates: ranked.slice(0, 8).map((x) => ({ productId: x.pp.p.id, reason: candidateReason(x.pp, dims) })),
    method: "rules",
    note: { kind: "ambiguous", dims: dims.slice(0, 3), noun },
  };
}

function unavailable(pool: { pp: Prepared }[], label: string, requested: string, available: string[], noun: string): MatchResult {
  return {
    productId: null,
    candidates: pool.slice(0, 8).map((x) => ({ productId: x.pp.p.id, reason: "Closest available" })),
    method: "rules",
    note: { kind: "unavailable", label, requested, available: sortSpecs(available), noun },
  };
}

function candidateReason(pp: Prepared, dims: AmbiguityDim[]) {
  return dims
    .map((d) => (d.key === "brand" ? pp.p.brand : pp.specByClass.get(d.key)?.display))
    .filter(Boolean)
    .join(" · ");
}

function nounFor(pps: Prepared[]) {
  const cats = uniq(pps.map((x) => x.p.category.toLowerCase()));
  if (cats.length === 1) return cats[0].replace(/^led /, "LED ").replace(/^mcb$/, "MCB");
  const heads = uniq(pps.map((x) => x.head));
  return heads.length === 1 ? heads[0] : "product";
}

export function plural(noun: string) {
  if (/(ch|sh|s|x)$/i.test(noun)) return `${noun}es`;
  return `${noun}s`;
}

function uniq<T>(xs: T[]) {
  return [...new Set(xs)];
}

function sortSpecs(vals: string[]) {
  return [...vals].sort((a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function displaySpec(norm: string) {
  return norm
    .replace(/sqmm$/, " sq mm")
    .replace(/^(\d+(?:\.\d+)?)a$/, "$1A")
    .replace(/^(\d+(?:\.\d+)?)w$/, "$1W")
    .replace(/way$/, "-way")
    .replace(/module$/, " module")
    .replace(/core$/, " core")
    .replace(/^(\d+(?:\.\d+)?)mm$/, "$1 mm")
    .replace(/^(\d+(?:\.\d+)?)m$/, "$1 m")
    .replace(/^[a-z]+$/, (c) => titleCase(c));
}
