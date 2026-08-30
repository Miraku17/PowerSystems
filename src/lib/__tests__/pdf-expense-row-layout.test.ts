/**
 * @jest-environment node
 */
/**
 * Regression guard for the Daily Time Sheet PDF (new 2026-05-25 layout).
 *
 * The JOB DESCRIPTION column is only ~28mm wide (180mm content width minus the
 * 152mm of fixed columns), so at font size 7 a description wraps after roughly
 * 22 characters. The route used to render `descLines.slice(0, 1)` inside a
 * fixed 6mm row, which silently dropped every line after the first — testers
 * saw encoded job descriptions cut off mid-sentence.
 *
 * `layoutExpenseRows` keeps every wrapped line and grows the row to fit.
 *
 * Runs under the node environment so jspdf resolves to its CJS build, matching
 * the API route that generates the PDF.
 */
import jsPDF from "jspdf";
import { layoutExpenseRows } from "@/lib/pdf-grid-helpers";

// Mirrors the constants used by src/app/api/pdf/daily-time-sheet/[id]/route.ts
const DESC_WIDTH = 28 - 2;
const BASE_ROW_H = 6;
const DESC_LINE_H = 3;

function makeDoc() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  return doc;
}

describe("layoutExpenseRows", () => {
  const longDesc = "Replaced fuel injection pump and calibrated timing on CAT 3406E";

  it("keeps every wrapped line of a long job description", () => {
    const doc = makeDoc();
    const { rows } = layoutExpenseRows(doc, [longDesc], DESC_WIDTH, BASE_ROW_H, DESC_LINE_H);

    expect(rows).toHaveLength(1);
    expect(rows[0].lines.length).toBeGreaterThan(1);
    // Nothing may be dropped: rejoining the wrapped lines reproduces the input.
    expect(rows[0].lines.join(" ")).toBe(longDesc);
  });

  it("grows the row height so every line has vertical room", () => {
    const doc = makeDoc();
    const { rows } = layoutExpenseRows(doc, [longDesc], DESC_WIDTH, BASE_ROW_H, DESC_LINE_H);

    const [row] = rows;
    expect(row.height).toBeGreaterThanOrEqual(row.lines.length * DESC_LINE_H);
    expect(row.height).toBeGreaterThan(BASE_ROW_H);
  });

  it("keeps short descriptions on a single base-height row", () => {
    const doc = makeDoc();
    const { rows } = layoutExpenseRows(doc, ["Lunch"], DESC_WIDTH, BASE_ROW_H, DESC_LINE_H);

    expect(rows[0].lines).toEqual(["Lunch"]);
    expect(rows[0].height).toBe(BASE_ROW_H);
  });

  it("emits one empty base-height row for an entry with no expense items", () => {
    const doc = makeDoc();
    const { rows, blockHeight } = layoutExpenseRows(doc, [], DESC_WIDTH, BASE_ROW_H, DESC_LINE_H);

    expect(rows).toHaveLength(1);
    expect(rows[0].lines).toEqual([]);
    expect(blockHeight).toBe(BASE_ROW_H);
  });

  it("treats null/undefined descriptions as empty without dropping the row", () => {
    const doc = makeDoc();
    const { rows } = layoutExpenseRows(
      doc,
      [null as any, undefined as any, ""],
      DESC_WIDTH,
      BASE_ROW_H,
      DESC_LINE_H,
    );

    expect(rows).toHaveLength(3);
    rows.forEach((r) => {
      expect(r.lines).toEqual([]);
      expect(r.height).toBe(BASE_ROW_H);
    });
  });

  it("reports blockHeight as the sum of its row heights", () => {
    const doc = makeDoc();
    const { rows, blockHeight } = layoutExpenseRows(
      doc,
      ["Lunch", longDesc, "Hotel accommodation in Iloilo City"],
      DESC_WIDTH,
      BASE_ROW_H,
      DESC_LINE_H,
    );

    expect(rows).toHaveLength(3);
    expect(blockHeight).toBe(rows.reduce((sum, r) => sum + r.height, 0));
  });

  it("breaks an unbroken run of characters instead of overflowing the column", () => {
    const doc = makeDoc();
    const { rows } = layoutExpenseRows(
      doc,
      ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
      DESC_WIDTH,
      BASE_ROW_H,
      DESC_LINE_H,
    );

    expect(rows[0].lines.length).toBeGreaterThan(1);
    rows[0].lines.forEach((line) => {
      expect(doc.getTextWidth(line)).toBeLessThanOrEqual(DESC_WIDTH);
    });
  });

  it("sanitizes non-Latin1 characters so they do not render as garbage", () => {
    const doc = makeDoc();
    const { rows } = layoutExpenseRows(doc, ["Café repair"], DESC_WIDTH, BASE_ROW_H, DESC_LINE_H);

    expect(rows[0].lines.join(" ")).toBe("Cafe repair");
  });
});
