/**
 * @jest-environment node
 */
/**
 * End-to-end regression guard: INITIAL LOC / FINAL LOC must not overflow.
 *
 * Those columns are 24mm wide and were drawn with one centred `doc.text(...)`
 * and no wrapping. jsPDF does not clip, so long values bled across the
 * neighbouring columns. The value below is real production data and measures
 * ~40mm at font size 7.
 */
import jsPDF from "jspdf";
import { GET } from "../[id]/route";

const LONG_LOC = "Santiago isabela victory bus terminal";
const SHORT_LOC = "Surigao office";

const record = {
  id: "dts-1",
  customer: "Silangan Mindanao Mining Co., Inc.",
  address: "Old decline",
  job_number: "3888",
  date: "2026-08-19",
  performed_by_name: "Gion Carpio",
  checked_by: null,
  approved_by_service: null,
  performed_by_signature: null,
  checked_by_signature: null,
  approved_by_service_signature: null,
  daily_time_sheet_entries: [
    {
      sort_order: 0,
      entry_date: "2026-08-19",
      start_time: "08:26",
      stop_time: "09:11",
      initial_location: LONG_LOC,
      final_location: SHORT_LOC,
      total_hours: 0.75,
      is_travel: true,
      // Deliberately no expense items: the block would be a single 6mm row, so
      // it has to grow to fit the wrapped location.
      daily_time_sheet_expense_items: [],
    },
  ],
};

jest.mock("@/lib/auth-middleware", () => ({
  withAuth:
    (handler: any) =>
    (request: any, ctx: any) =>
      handler(request, { user: { id: "u1", email: "t@example.com" }, ...ctx }),
}));

jest.mock("@/lib/supabase", () => ({
  getServiceSupabase: () => {
    const chain: any = new Proxy(
      {
        single: async () => ({ data: record, error: null }),
        then: (resolve: any) => resolve({ data: [], error: null }),
      },
      { get: (t, p) => (p in t ? (t as any)[p] : () => chain) },
    );
    return { from: () => chain };
  },
}));

describe("Daily Time Sheet PDF — location cells wrap instead of overflowing", () => {
  let pdf: string;

  beforeAll(async () => {
    const response = await (GET as any)(
      new Request("http://localhost/api/pdf/daily-time-sheet/dts-1"),
      { params: Promise.resolve({ id: "dts-1" }) },
    );
    expect(response.status).toBe(200);
    pdf = Buffer.from(await response.arrayBuffer()).toString("latin1");
  });

  it("never draws a location string wider than its 24mm column", () => {
    const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    probe.setFont("helvetica", "normal");
    probe.setFontSize(7);

    // The unwrapped value must not appear as a single drawn string.
    expect(probe.getTextWidth(LONG_LOC)).toBeGreaterThan(24);
    expect(pdf).not.toContain(LONG_LOC);
  });

  it("still renders every word of the location", () => {
    for (const word of LONG_LOC.split(" ")) {
      expect(pdf).toContain(word);
    }
  });

  it("leaves a short location untouched", () => {
    expect(pdf).toContain(SHORT_LOC);
  });
});
