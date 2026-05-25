import { useDailyTimeSheetFormStore } from '../dailyTimeSheetFormStore';

const store = () => useDailyTimeSheetFormStore.getState();

describe('dailyTimeSheetFormStore — expense_items actions', () => {
  beforeEach(() => {
    store().resetFormData();
  });

  it('initial entry has empty expense_items array', () => {
    const entry = store().formData.entries[0];
    expect(entry.expense_items).toEqual([]);
  });

  it('addExpenseItem appends a typed item to the entry', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    const entry = store().formData.entries[0];
    expect(entry.expense_items).toHaveLength(1);
    expect(entry.expense_items[0]).toMatchObject({
      type: 'breakfast',
      amount: '',
      job_description: '',
      departure_odo: '',
      arrival_odo: '',
    });
    expect(entry.expense_items[0].id).toMatch(/^expense-/);
    expect(entry.expense_items[0].sort_order).toBe(0);
  });

  it('addExpenseItem assigns incrementing sort_order per entry', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    store().addExpenseItem(entryId, 'car_odo');
    store().addExpenseItem(entryId, 'hotel_others');
    const items = store().formData.entries[0].expense_items;
    expect(items.map(i => i.sort_order)).toEqual([0, 1, 2]);
    expect(items.map(i => i.type)).toEqual(['breakfast', 'car_odo', 'hotel_others']);
  });

  it('updateExpenseItem patches only the targeted item', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    store().addExpenseItem(entryId, 'hotel_others');
    const itemId = store().formData.entries[0].expense_items[1].id;
    store().updateExpenseItem(entryId, itemId, { amount: '5000', job_description: 'Hotel night' });
    const items = store().formData.entries[0].expense_items;
    expect(items[0].amount).toBe('');
    expect(items[1]).toMatchObject({ amount: '5000', job_description: 'Hotel night' });
  });

  it('removeExpenseItem removes the targeted item only', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    store().addExpenseItem(entryId, 'hotel_others');
    const firstId = store().formData.entries[0].expense_items[0].id;
    store().removeExpenseItem(entryId, firstId);
    const items = store().formData.entries[0].expense_items;
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('hotel_others');
  });

  it('addRow / addDateRow create entries with empty expense_items', () => {
    store().addRow();
    store().addDateRow();
    const entries = store().formData.entries;
    expect(entries).toHaveLength(3);
    entries.forEach(e => expect(e.expense_items).toEqual([]));
  });

  it('initial entry has new location + travel fields set to empty/false', () => {
    const entry = store().formData.entries[0];
    expect(entry.initial_location).toBe('');
    expect(entry.final_location).toBe('');
    expect(entry.is_travel).toBe(false);
  });
});
