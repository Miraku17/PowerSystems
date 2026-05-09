/**
 * Behavior tests for the form-records sort comparator.
 *
 * Sortable columns:
 *   - customer       (string, locale-compare with numeric flag)
 *   - jo_number      (string, locale-compare with numeric flag)
 *   - date_modified  (timestamp; falls back to dateCreated when dateUpdated absent)
 */
import { sortRecords } from '../page';

const make = (overrides: Partial<any>) => ({
  id: overrides.id ?? Math.random().toString(),
  companyFormId: 0,
  data: {},
  companyForm: { id: '1', name: 'Form', formType: 'deutz-service' },
  dateCreated: '',
  dateUpdated: '',
  ...overrides,
});

const getCustomer = (r: any) => r._customer ?? '';
const getJobOrder = (r: any) => r._jo ?? '';

describe('sortRecords', () => {
  it('sorts by customer ascending', () => {
    const recs = [
      make({ id: '1', _customer: 'Charlie' }),
      make({ id: '2', _customer: 'Alpha' }),
      make({ id: '3', _customer: 'Bravo' }),
    ];
    const out = sortRecords(recs as any, 'customer', 'asc', getJobOrder, getCustomer);
    expect(out.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by customer descending', () => {
    const recs = [
      make({ id: '1', _customer: 'Charlie' }),
      make({ id: '2', _customer: 'Alpha' }),
      make({ id: '3', _customer: 'Bravo' }),
    ];
    const out = sortRecords(recs as any, 'customer', 'desc', getJobOrder, getCustomer);
    expect(out.map((r) => r.id)).toEqual(['1', '3', '2']);
  });

  it('sorts by JO number using natural numeric ordering (JO-2 < JO-10)', () => {
    const recs = [
      make({ id: '1', _jo: 'JO-10' }),
      make({ id: '2', _jo: 'JO-2' }),
      make({ id: '3', _jo: 'JO-9' }),
    ];
    const out = sortRecords(recs as any, 'jo_number', 'asc', getJobOrder, getCustomer);
    expect(out.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by date_modified descending (newest first)', () => {
    const recs = [
      make({ id: '1', dateUpdated: '2025-01-15T00:00:00Z', dateCreated: '2025-01-01T00:00:00Z' }),
      make({ id: '2', dateUpdated: '2025-03-09T00:00:00Z', dateCreated: '2025-01-01T00:00:00Z' }),
      make({ id: '3', dateUpdated: '2025-02-28T00:00:00Z', dateCreated: '2025-01-01T00:00:00Z' }),
    ];
    const out = sortRecords(recs as any, 'date_modified', 'desc', getJobOrder, getCustomer);
    expect(out.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('falls back to dateCreated when dateUpdated is missing', () => {
    const recs = [
      make({ id: '1', dateUpdated: '', dateCreated: '2024-01-01T00:00:00Z' }),
      make({ id: '2', dateUpdated: '', dateCreated: '2025-01-01T00:00:00Z' }),
    ];
    const out = sortRecords(recs as any, 'date_modified', 'asc', getJobOrder, getCustomer);
    expect(out.map((r) => r.id)).toEqual(['1', '2']);
  });

  it('does not mutate the input array', () => {
    const recs = [
      make({ id: '1', _customer: 'B' }),
      make({ id: '2', _customer: 'A' }),
    ];
    const original = recs.map((r) => r.id);
    sortRecords(recs as any, 'customer', 'asc', getJobOrder, getCustomer);
    expect(recs.map((r) => r.id)).toEqual(original);
  });

  it('case-insensitive sort (alpha vs Beta)', () => {
    const recs = [
      make({ id: '1', _customer: 'Beta' }),
      make({ id: '2', _customer: 'alpha' }),
    ];
    const out = sortRecords(recs as any, 'customer', 'asc', getJobOrder, getCustomer);
    expect(out.map((r) => r.id)).toEqual(['2', '1']);
  });
});
