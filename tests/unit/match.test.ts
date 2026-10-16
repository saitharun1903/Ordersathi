import { describe, expect, it } from "vitest";
import { describeNote, matchLine } from "@/server/orders/match";
import { parseSegment } from "@/server/orders/parse";
import { normalizeText } from "@/lib/normalize";
import { catalogue } from "./helpers";

const m = (text: string, extra: Partial<Parameters<typeof matchLine>[0]> = {}) => {
  const l = parseSegment(text)!;
  return matchLine({ description: l.description, originalText: text, requestedUnit: l.unit, ...extra }, catalogue);
};

describe("matcher", () => {
  it("matches a fully specified item to one product", () => {
    expect(m("10 Anchor Roma 6A 1 way switches").productId).toBe("ANC-RS-6A-1W");
    expect(m("2 rolls Polycab 2.5 sq mm red wire").productId).toBe("POL-FR-2.5-RD");
    expect(m("Havells 32A DP MCB x 2").productId).toBe("HAV-MCB-32A-DP");
  });

  it("never picks a variant when details are missing — explains what differs", () => {
    const r = m("five sockets");
    expect(r.productId).toBeNull();
    expect(r.candidates.map((c) => c.productId).sort()).toEqual(["ANC-RS-16A-SKT", "ANC-RS-6A-SKT", "HAV-CR-16A-SKT", "HAV-CR-6A-SKT"]);
    const msgs = describeNote(r.note);
    expect(msgs).toContain("Brand not specified — both Anchor and Havells sockets match");
    expect(msgs).toContain("Rating not specified — both 6A and 16A sockets match");
  });

  it("does not invent wire gauge, brand or colour", () => {
    const r = m("two rolls of wire");
    expect(r.productId).toBeNull();
    const msgs = describeNote(r.note).join(" | ");
    expect(msgs).toMatch(/Wire size not specified/);
    expect(msgs).toMatch(/Colour not specified/);
    expect(msgs).toMatch(/Brand not specified/);
  });

  it("reports when a requested specification is not stocked", () => {
    const r = m("10A socket 4 nos");
    expect(r.productId).toBeNull();
    expect(describeNote(r.note)[0]).toBe("No 10A socket in the catalogue — available: 6A, 16A");
  });

  it("matches Telugu and transliterated wording", () => {
    expect(m("రెండు చుట్టలు పాలీక్యాబ్ 2.5 ఎర్ర వైరు").productId).toBe("POL-FR-2.5-RD");
    expect(m("tube light 10").productId).toBe("WIP-BAT-20W");
  });

  it("prefers customer-specific wording only for that customer", () => {
    const withAlias = catalogue.map((p) => (p.id === "ANC-RS-6A-1W" ? { ...p, aliases: [...p.aliases, { normalized: normalizeText("maamulu switch"), customerId: "cust-1" }] } : p));
    const l = parseSegment("maamulu switch 20")!;
    const forCustomer = matchLine({ description: l.description, originalText: "", customerId: "cust-1" }, withAlias);
    const forOther = matchLine({ description: l.description, originalText: "", customerId: "cust-2" }, withAlias);
    expect(forCustomer.productId).toBe("ANC-RS-6A-1W");
    expect(forCustomer.method).toBe("customer-alias");
    expect(forOther.productId).toBeNull();
  });

  it("ignores AI-suggested ids that are not in the catalogue", () => {
    const r = matchLine({ description: "flux capacitor", originalText: "flux capacitor 2", aiSuggestedProductIds: [] }, catalogue);
    expect(r.productId).toBeNull();
    expect(r.candidates).toEqual([]);
  });
});
