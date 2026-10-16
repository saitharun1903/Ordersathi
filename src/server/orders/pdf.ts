import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatPaise, formatQty } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { unitLabel } from "@/lib/units";
import type { ApprovedSnapshot } from "./service";

// Renders an "Order confirmation" (explicitly not a tax invoice) from the
// immutable approval snapshot, so later catalogue changes never alter it.

const INK = rgb(0.114, 0.137, 0.125);
const MUTED = rgb(0.43, 0.46, 0.44);
const LINE = rgb(0.86, 0.84, 0.8);
const BRAND = rgb(0.051, 0.353, 0.271);
const AMBER_BG = rgb(0.984, 0.941, 0.851);
const AMBER = rgb(0.6, 0.36, 0.05);

let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;
async function fonts() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    fontCache = {
      regular: await readFile(path.join(dir, "DejaVuSans.ttf")),
      bold: await readFile(path.join(dir, "DejaVuSans-Bold.ttf")),
    };
  }
  return fontCache;
}

/** Drop characters the embedded font cannot draw (e.g. Telugu script) instead of printing boxes. */
function safe(font: PDFFont, text: string) {
  const supported = new Set(font.getCharacterSet());
  const out = [...text].map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : "")).join("").replace(/\s+/g, " ").trim();
  // Text entirely in an unsupported script (e.g. a Telugu-only shop name) gets a visible placeholder, not a blank.
  return out || (text.trim() ? "(name in Telugu)" : "");
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = safe(font, text).split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function renderConfirmationPdf(s: ApprovedSnapshot): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = await fonts();
  const regular = await doc.embedFont(f.regular, { subset: true });
  const bold = await doc.embedFont(f.bold, { subset: true });
  const number = `#${String(s.number).padStart(4, "0")}`;
  doc.setTitle(`Order confirmation ${number} — ${s.business.name}`);
  doc.setProducer("OrderSathi");
  doc.setCreator("OrderSathi");

  const W = 595.28;
  const H = 841.89;
  const M = 44;
  const pages: PDFPage[] = [];
  let page = doc.addPage([W, H]);
  pages.push(page);
  let y = H - M;

  const text = (p: PDFPage, t: string, x: number, yy: number, size = 9.5, font = regular, color = INK) =>
    p.drawText(safe(font, t), { x, y: yy, size, font, color });
  const right = (p: PDFPage, t: string, xRight: number, yy: number, size = 9.5, font = regular, color = INK) => {
    const st = safe(font, t);
    p.drawText(st, { x: xRight - font.widthOfTextAtSize(st, size), y: yy, size, font, color });
  };

  if (s.business.isDemo) {
    page.drawRectangle({ x: 0, y: H - 22, width: W, height: 22, color: AMBER_BG });
    text(page, "SAMPLE DOCUMENT — fictional demo business, customer and prices", M, H - 15, 8.5, bold, AMBER);
    y -= 14;
  }

  // Header
  text(page, s.business.name, M, y - 4, 15, bold);
  right(page, "ORDER CONFIRMATION", W - M, y - 2, 10, bold, BRAND);
  y -= 20;
  const bizLines = [s.business.addressLine, [s.business.city, s.business.state].filter(Boolean).join(", "), s.business.phone ? `Phone ${s.business.phone}` : null, s.business.gstin ? `GSTIN ${s.business.gstin}` : null].filter(
    (x): x is string => !!x,
  );
  const meta: [string, string][] = [
    ["Order", number],
    ["Ordered", formatDate(s.createdAt)],
    ["Approved", `${formatDate(s.approvedAt)}, ${formatTime(s.approvedAt)}`],
  ];
  for (let i = 0; i < Math.max(bizLines.length, meta.length); i++) {
    if (bizLines[i]) text(page, bizLines[i], M, y, 9, regular, MUTED);
    if (meta[i]) {
      right(page, meta[i][1], W - M, y, 9, bold);
      right(page, meta[i][0], W - M - bold.widthOfTextAtSize(safe(bold, meta[i][1]), 9) - 8, y, 9, regular, MUTED);
    }
    y -= 13;
  }
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: LINE });
  y -= 20;

  // Customer
  text(page, "CONFIRMED FOR", M, y, 7.5, bold, MUTED);
  y -= 14;
  if (s.customer) {
    text(page, s.customer.name, M, y, 11, bold);
    y -= 13;
    const c = [s.customer.contactName, s.customer.city, s.customer.phone].filter(Boolean).join("  ·  ");
    if (c) {
      text(page, c, M, y, 9, regular, MUTED);
      y -= 13;
    }
  }
  y -= 12;

  // Table
  // Right edges of the numeric columns
  const cols = { idx: M, item: M + 22, qtyR: W - M - 190, priceR: W - M - 96, amountR: W - M - 4 };
  const header = (p: PDFPage) => {
    p.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: rgb(0.965, 0.957, 0.933) });
    text(p, "#", cols.idx + 4, y, 8, bold, MUTED);
    text(p, "ITEM", cols.item, y, 8, bold, MUTED);
    right(p, "QUANTITY", cols.qtyR, y, 8, bold, MUTED);
    right(p, "UNIT PRICE", cols.priceR, y, 8, bold, MUTED);
    right(p, "AMOUNT", cols.amountR, y, 8, bold, MUTED);
    y -= 24;
  };
  header(page);
  const itemWidth = cols.qtyR - 80 - cols.item;
  s.lines.forEach((l, i) => {
    const nameLines = wrap(bold, l.name, 9.5, itemWidth);
    const detail = [l.sku, l.brand].filter(Boolean).join("  ·  ");
    const rowH = nameLines.length * 12 + 14;
    if (y - rowH < M + 90) {
      page = doc.addPage([W, H]);
      pages.push(page);
      y = H - M;
      header(page);
    }
    text(page, String(i + 1), cols.idx + 4, y, 9, regular, MUTED);
    nameLines.forEach((nl, k) => text(page, nl, cols.item, y - k * 12, 9.5, bold));
    text(page, detail, cols.item, y - nameLines.length * 12, 8, regular, MUTED);
    const q = Number(l.sellQuantity);
    right(page, `${formatQty(l.sellQuantity)} ${unitLabel(l.sellingUnit, q)}`, cols.qtyR, y, 9.5);
    right(page, formatPaise(l.unitPricePaise), cols.priceR, y, 9.5);
    if (l.priceSource === "CUSTOMER") right(page, "customer price", cols.priceR, y - 12, 7.5, regular, BRAND);
    right(page, formatPaise(l.lineTotalPaise), cols.amountR, y, 9.5, bold);
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 0.5, color: LINE });
  });

  // Totals
  y -= 6;
  const tot = (label: string, value: string, strong = false) => {
    right(page, label, W - M - 110, y, strong ? 10.5 : 9.5, strong ? bold : regular, strong ? INK : MUTED);
    right(page, value, W - M - 4, y, strong ? 11.5 : 9.5, strong ? bold : regular);
    y -= strong ? 18 : 15;
  };
  tot("Subtotal", formatPaise(s.subtotalPaise));
  if (s.taxPaise > 0 && s.taxRateBps) tot(s.taxLabel ?? `Tax ${s.taxRateBps / 100}%`, formatPaise(s.taxPaise));
  page.drawLine({ start: { x: W - M - 200, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.8, color: INK });
  y -= 4;
  tot("Total", formatPaise(s.totalPaise), true);
  if (!s.taxPaise) {
    right(page, "No tax applied on this confirmation", W - M - 4, y, 8, regular, MUTED);
    y -= 12;
  }

  // Footer on every page
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M + 26 }, end: { x: W - M, y: M + 26 }, thickness: 0.5, color: LINE });
    text(p, "This is an order confirmation, not a tax invoice. Prices are as approved and will not change if the catalogue is updated.", M, M + 12, 7.5, regular, MUTED);
    text(p, `Approved by ${s.approvedBy.name} on ${formatDateTime(s.approvedAt)} (IST) · Generated with OrderSathi`, M, M, 7.5, regular, MUTED);
    right(p, `Page ${i + 1} of ${pages.length}`, W - M, M, 7.5, regular, MUTED);
  });

  return doc.save();
}
