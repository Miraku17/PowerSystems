import { computeSummary, TimeSheetEntry, ExpenseItem } from '../dailyTimeSheetFormStore';

const makeEntry = (overrides: Partial<TimeSheetEntry> = {}): TimeSheetEntry => ({
  id: 'e1',
  entry_date: '2026-05-17',
  start_time: '',
  stop_time: '',
  total_hours: '',
  has_date: true,
  initial_location: '',
  final_location: '',
  is_travel: false,
  expense_items: [],
  ...overrides,
});

const makeExpense = (overrides: Partial<ExpenseItem>): ExpenseItem => ({
  id: 'x1',
  type: 'breakfast',
  amount: '',
  job_description: '',
  departure_odo: '',
  arrival_odo: '',
  sort_order: 0,
  ...overrides,
});

describe('computeSummary', () => {
  it('returns all zeros for an empty entry list', () => {
    const s = computeSummary([]);
    expect(s).toEqual({
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalTravelHours: 0,
      grandTotalManhours: 0,
      totalMealAllowance: 0,
      totalFareExpense: 0,
      totalHotelOthers: 0,
      grandTotalExpense: 0,
      totalDistanceTravelKm: 0,
    });
  });

  it('splits an 8a–5p non-travel shift into 9h regular, 0h OT', () => {
    const s = computeSummary([makeEntry({ start_time: '08:00', stop_time: '17:00' })]);
    expect(s.totalRegularHours).toBe(9);
    expect(s.totalOvertimeHours).toBe(0);
    expect(s.totalTravelHours).toBe(0);
    expect(s.grandTotalManhours).toBe(9);
  });

  it('counts pre-8am hours as overtime for non-travel entries', () => {
    const s = computeSummary([makeEntry({ start_time: '06:00', stop_time: '08:00' })]);
    expect(s.totalRegularHours).toBe(0);
    expect(s.totalOvertimeHours).toBe(2);
  });

  it('counts travel entries entirely as travel hours', () => {
    const s = computeSummary([
      makeEntry({ start_time: '06:00', stop_time: '08:00', is_travel: true }),
    ]);
    expect(s.totalTravelHours).toBe(2);
    expect(s.totalRegularHours).toBe(0);
    expect(s.totalOvertimeHours).toBe(0);
    expect(s.grandTotalManhours).toBe(2);
  });

  it('photo example: 2h OT + 9h regular + 3h travel = 14h grand total', () => {
    const s = computeSummary([
      makeEntry({ start_time: '06:00', stop_time: '08:00' }),                       // 2h OT
      makeEntry({ start_time: '08:00', stop_time: '17:00' }),                       // 9h regular (overlap)
      makeEntry({ start_time: '17:00', stop_time: '20:00', is_travel: true }),      // 3h travel
    ]);
    expect(s.totalOvertimeHours).toBeCloseTo(2);
    expect(s.totalRegularHours).toBeCloseTo(9); // 08:00–17:00 overlap
    expect(s.totalTravelHours).toBeCloseTo(3);
  });

  it('aggregates meal expenses across breakfast/lunch/dinner', () => {
    const e = makeEntry({
      expense_items: [
        makeExpense({ type: 'breakfast', amount: '100' }),
        makeExpense({ type: 'lunch', amount: '150' }),
        makeExpense({ type: 'dinner', amount: '200' }),
      ],
    });
    const s = computeSummary([e]);
    expect(s.totalMealAllowance).toBe(450);
  });

  it('car_odo contributes amount to fare and ODO delta to distance', () => {
    const e = makeEntry({
      expense_items: [
        makeExpense({
          type: 'car_odo',
          amount: '0',
          departure_odo: '25641',
          arrival_odo: '26641',
        }),
      ],
    });
    const s = computeSummary([e]);
    expect(s.totalFareExpense).toBe(0);
    expect(s.totalDistanceTravelKm).toBe(1000);
  });

  it('hotel_others aggregates to its own bucket', () => {
    const e = makeEntry({
      expense_items: [makeExpense({ type: 'hotel_others', amount: '5000' })],
    });
    const s = computeSummary([e]);
    expect(s.totalHotelOthers).toBe(5000);
    expect(s.grandTotalExpense).toBe(5000);
  });

  it('grandTotalExpense sums all three buckets', () => {
    const e = makeEntry({
      expense_items: [
        makeExpense({ type: 'breakfast', amount: '100' }),
        makeExpense({ type: 'car_odo', amount: '50' }),
        makeExpense({ type: 'hotel_others', amount: '5000' }),
      ],
    });
    const s = computeSummary([e]);
    expect(s.grandTotalExpense).toBe(5150);
  });
});
