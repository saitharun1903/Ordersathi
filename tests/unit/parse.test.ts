import { describe, expect, it } from "vitest";
import { parseOrderText, parseSegment } from "@/server/orders/parse";

describe("parser", () => {
  it("does not mistake a wire size for a quantity", () => {
    const [l] = parseOrderText("2.5 sq mm wire");
    expect(l.quantity).toBeNull();
    expect(l.description).toContain("2.5sqmm");
  });

  it("separates quantity and unit from size", () => {
    const l = parseSegment("2.5 sq. mm red wire - 3 rolls")!;
    expect(l.quantity).toBe(3);
    expect(l.unit).toBe("ROLL");
    expect(l.description).toBe("2.5sqmm red wire");
  });

  it("treats ratings as specs, not quantities", () => {
    const l = parseSegment("16A socket 4 nos")!;
    expect(l.quantity).toBe(4);
    expect(l.unit).toBe("PIECE");
    expect(l.description).toBe("16a socket");
  });

  it("reads English, Telugu and transliterated number words", () => {
    expect(parseSegment("ten switches")!.quantity).toBe(10);
    expect(parseSegment("padi 6a switchlu")!.quantity).toBe(10);
    expect(parseSegment("రెండు చుట్టలు వైరు")!).toMatchObject({ quantity: 2, unit: "ROLL" });
    expect(parseSegment("ఇరవై ఐదు బల్బులు")!.quantity).toBe(25);
  });

  it("handles spoken numbers in specs from voice transcripts", () => {
    const l = parseSegment("two rolls of Polycab two point five square mm red wire")!;
    expect(l).toMatchObject({ quantity: 2, unit: "ROLL" });
    expect(l.description).toContain("2.5sqmm");
  });

  it("flags unknown packaging words instead of guessing", () => {
    const l = parseSegment("5 katta wire")!;
    expect(l.quantity).toBe(5);
    expect(l.unit).toBeNull();
    expect(l.rawUnit).toBe("katta");
    expect(l.unitRecognized).toBe(false);
  });

  it("leaves quantity empty when none is stated", () => {
    const l = parseSegment("Polycab 1.5 sq mm black wire")!;
    expect(l.quantity).toBeNull();
  });

  it("splits a message into lines and drops greetings", () => {
    const lines = parseOrderText("Hello sir, this is Ravi. Send ten switches, five sockets and two rolls of wire.");
    expect(lines.map((l) => [l.description, l.quantity, l.unit])).toEqual([
      ["switch", 10, null],
      ["socket", 5, null],
      ["wire", 2, "ROLL"],
    ]);
  });

  it("supports numbered lists and x-quantity notation", () => {
    const lines = parseOrderText("1. Havells 32A DP MCB x 2\n2. Legrand 16 amp MCB - 6");
    expect(lines.map((l) => l.quantity)).toEqual([2, 6]);
    expect(lines[1].description).toBe("legrand 16a mcb");
  });
});
