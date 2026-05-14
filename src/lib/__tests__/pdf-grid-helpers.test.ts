import { installTextSanitizer, sanitizeLatin1 } from "@/lib/pdf-grid-helpers";

// Minimal jsPDF stub: records every call to doc.text after the sanitizer patches it.
function makeStubDoc() {
  const calls: any[][] = [];
  const doc = {
    text(...args: any[]) {
      calls.push(args);
      return this;
    },
  };
  return { doc, calls };
}

describe("installTextSanitizer", () => {
  it("coerces numeric values to strings before passing to doc.text", () => {
    const { doc, calls } = makeStubDoc();
    installTextSanitizer(doc as any);

    // Reproduces the DTS export bug: numeric DB column (e.g. leave_hours = 24)
    // piped through `getValue = v => v || ""` would return the raw number.
    doc.text(24 as any, 10, 20);

    expect(calls[0][0]).toBe("24");
  });

  it("coerces null/undefined to empty string", () => {
    const { doc, calls } = makeStubDoc();
    installTextSanitizer(doc as any);

    doc.text(null as any, 0, 0);
    doc.text(undefined as any, 0, 0);

    expect(calls[0][0]).toBe("");
    expect(calls[1][0]).toBe("");
  });

  it("sanitizes string arrays element-wise and coerces non-string entries", () => {
    const { doc, calls } = makeStubDoc();
    installTextSanitizer(doc as any);

    doc.text(["hello", 7 as any, null as any] as any, 0, 0);

    expect(calls[0][0]).toEqual(["hello", "7", ""]);
  });

  it("is idempotent — installing twice does not double-wrap", () => {
    const { doc, calls } = makeStubDoc();
    installTextSanitizer(doc as any);
    installTextSanitizer(doc as any);

    doc.text(42 as any, 0, 0);

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("42");
  });

  it("preserves trailing args (x, y, options) unchanged", () => {
    const { doc, calls } = makeStubDoc();
    installTextSanitizer(doc as any);

    const opts = { align: "center" as const };
    doc.text("title", 105, 20, opts);

    expect(calls[0]).toEqual(["title", 105, 20, opts]);
  });
});

describe("sanitizeLatin1", () => {
  it("strips diacritics down to ASCII", () => {
    expect(sanitizeLatin1("café")).toBe("cafe");
  });

  it("maps non-Latin1 letters to ASCII fallbacks", () => {
    expect(sanitizeLatin1("İstanbul")).toBe("Istanbul");
    expect(sanitizeLatin1("Łódź")).toBe("Lodz");
  });

  it("replaces non-mappable characters with ?", () => {
    expect(sanitizeLatin1("hello •")).toBe("hello ?");
  });
});
