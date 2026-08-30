/**
 * @jest-environment node
 */
/**
 * End-to-end regression guard for the reported bug: "encoded job description is
 * cut on the PDF".
 *
 * In the new (2026-05-25) Daily Time Sheet layout the JOB DESCRIPTION column is
 * ~28mm wide, so at font size 7 a description wraps after roughly 22 characters.
 * The route used to draw only `descLines.slice(0, 1)`, dropping every line after
 * the first. This renders the real route and asserts the whole description
 * reaches the PDF content stream.
 */
import { GET } from "../[id]/route";

const LONG_DESC = "Replaced fuel injection pump and calibrated timing on CAT 3406E";

const record = {
  id: "dts-1",
  customer: "ACME Mining Corp",
  address: "Surigao del Norte",
  job_number: "JO-2026-0042",
  date: "2026-08-01",
  performed_by_name: "Juan Dela Cruz",
  checked_by: "Maria Santos",
  approved_by_service: "Pedro Reyes",
  performed_by_signature: null,
  checked_by_signature: null,
  approved_by_service_signature: null,
  daily_time_sheet_entries: [
    {
      sort_order: 0,
      entry_date: "2026-08-01",
      start_time: "08:00",
      stop_time: "17:00",
      initial_location: "Manila",
      final_location: "Surigao",
      total_hours: 9,
      is_travel: false,
      daily_time_sheet_expense_items: [
        { sort_order: 0, type: "lunch", amount: 250, job_description: LONG_DESC },
      ],
    },
  ],
};

jest.mock("@/lib/auth-middleware", () => ({
  // Bypass auth: hand the handler a stub user alongside the route's params.
  withAuth:
    (handler: any) =>
    (request: any, ctx: any) =>
      handler(request, { user: { id: "u1", email: "t@example.com" }, ...ctx }),
}));

jest.mock("@/lib/supabase", () => ({
  // Chainable query stub: every builder method returns the same thenable, so the
  // route can call .select/.eq/.order/.ilike/.limit in any order. `single()`
  // yields the record under test; awaiting the chain yields an empty list
  // (attachments, signature lookups).
  getServiceSupabase: () => {
    const chain: any = new Proxy(
      {
        single: async () => ({ data: record, error: null }),
        then: (resolve: any) => resolve({ data: [], error: null }),
      },
      {
        get(target, prop) {
          if (prop in target) return (target as any)[prop];
          return () => chain;
        },
      },
    );
    return { from: () => chain };
  },
}));

describe("Daily Time Sheet PDF — job description is not truncated", () => {
  let pdf: string;

  beforeAll(async () => {
    const response = await (GET as any)(
      new Request("http://localhost/api/pdf/daily-time-sheet/dts-1"),
      { params: Promise.resolve({ id: "dts-1" }) },
    );
    expect(response.status).toBe(200);
    // jsPDF emits uncompressed content streams here, so drawn text is literal.
    pdf = Buffer.from(await response.arrayBuffer()).toString("latin1");
  });

  it("renders every word of a description that wraps past the first line", () => {
    // The column wraps mid-sentence, so assert on words rather than the whole
    // string: the tail words are exactly what the old slice(0, 1) dropped.
    for (const word of LONG_DESC.split(" ")) {
      expect(pdf).toContain(word);
    }
  });

  it("still renders the surrounding row data", () => {
    expect(pdf).toContain("Lunch");
    expect(pdf).toContain("JOB DESCRIPTION");
  });
});
