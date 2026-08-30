/**
 * @jest-environment node
 */
/**
 * Regression guard for overflowing INITIAL LOC / FINAL LOC cells in the
 * Daily Time Sheet PDF (new 2026-05-25 layout).
 *
 * Those columns are 24mm wide and were drawn with a single centred
 * `doc.text(...)` call and no wrapping. jsPDF does not clip, so a long location
 * bleeds straight across its neighbours — the real production value
 * "Santiago isabela victory bus terminal" measures 40mm in a 24mm cell and
 * runs through the STOP column.
 *
 * `wrapSpanCell` wraps the text; `layoutExpenseRows`' `minBlockHeight` lets the
 * block grow to fit a span that is taller than its expense rows, with the last
 * expense row absorbing the shortfall so the two column stacks stay flush.
 *
 * Runs under the node environment so jspdf resolves to its CJS build, matching
 * the API route that generates the PDF.
 */
import jsPDF from "jspdf";
import { layoutExpenseRows, wrapSpanCell } from "@/lib/pdf-grid-helpers";

// Mirrors the constants in src/app/api/pdf/daily-time-sheet/[id]/route.ts
const LOC_WIDTH = 24 - 2;
const DESC_WIDTH = 28 - 2;
const BASE_ROW_H = 6;
const LINE_H = 3;

const LONG_LOC = "Santiago isabela victory bus terminal";

function makeDoc() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  return doc;
}

describe("wrapSpanCell", () => {
  it("wraps a location that is wider than its column", () => {
    const doc = makeDoc();
    // Guard the premise: this really does overflow when drawn unwrapped.
    expect(doc.getTextWidth(LONG_LOC)).toBeGreaterThan(LOC_WIDTH);

    const { lines } = wrapSpanCell(doc, LONG_LOC, LOC_WIDTH, LINE_H);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(LONG_LOC);
  });

  it("keeps every wrapped line inside the column width", () => {
    const doc = makeDoc();
    const { lines } = wrapSpanCell(doc, LONG_LOC, LOC_WIDTH, LINE_H);

    lines.forEach((line) => {
      expect(doc.getTextWidth(line)).toBeLessThanOrEqual(LOC_WIDTH);
    });
  });

  it("reports a height that covers every line", () => {
    const doc = makeDoc();
    const { lines, height } = wrapSpanCell(doc, LONG_LOC, LOC_WIDTH, LINE_H);

    expect(height).toBeGreaterThanOrEqual(lines.length * LINE_H);
  });

  it("leaves a short location on one line", () => {
    const doc = makeDoc();
    const { lines } = wrapSpanCell(doc, "Surigao office", LOC_WIDTH, LINE_H);
    expect(lines).toEqual(["Surigao office"]);
  });

  it("treats empty and null text as no lines and no height", () => {
    const doc = makeDoc();
    for (const value of ["", null, undefined]) {
      const { lines, height } = wrapSpanCell(doc, value as any, LOC_WIDTH, LINE_H);
      expect(lines).toEqual([]);
      expect(height).toBe(0);
    }
  });

  it("sanitizes non-Latin1 characters", () => {
    const doc = makeDoc();
    const { lines } = wrapSpanCell(doc, "Peñaranda", LOC_WIDTH, LINE_H);
    expect(lines.join(" ")).toBe("Penaranda");
  });
});

describe("layoutExpenseRows minBlockHeight", () => {
  it("grows the block to the requested minimum", () => {
    const doc = makeDoc();
    const { blockHeight } = layoutExpenseRows(doc, ["Lunch"], DESC_WIDTH, BASE_ROW_H, LINE_H, 20);
    expect(blockHeight).toBe(20);
  });

  it("puts the shortfall on the last row so both column stacks stay flush", () => {
    const doc = makeDoc();
    const { rows, blockHeight } = layoutExpenseRows(
      doc,
      ["Lunch", "Dinner"],
      DESC_WIDTH,
      BASE_ROW_H,
      LINE_H,
      20,
    );

    expect(rows.reduce((sum, r) => sum + r.height, 0)).toBe(blockHeight);
    expect(rows[0].height).toBe(BASE_ROW_H);
    expect(rows[rows.length - 1].height).toBe(20 - BASE_ROW_H);
  });

  it("ignores a minimum smaller than the rows already need", () => {
    const doc = makeDoc();
    const { rows, blockHeight } = layoutExpenseRows(
      doc,
      ["Lunch", "Dinner", "Breakfast"],
      DESC_WIDTH,
      BASE_ROW_H,
      LINE_H,
      5,
    );
    expect(blockHeight).toBe(BASE_ROW_H * 3);
    rows.forEach((r) => expect(r.height).toBe(BASE_ROW_H));
  });

  it("defaults to no minimum when the argument is omitted", () => {
    const doc = makeDoc();
    const { blockHeight } = layoutExpenseRows(doc, ["Lunch"], DESC_WIDTH, BASE_ROW_H, LINE_H);
    expect(blockHeight).toBe(BASE_ROW_H);
  });
});
