/**
 * Behavior tests for the "Last Modified" cell formatter on the form records list.
 *
 * Format: "DD-MMM-YY by <username>"
 *   - DD = 2-digit day, zero-padded
 *   - MMM = uppercase 3-letter month abbreviation (e.g. "JAN", "MAR")
 *   - YY = 2-digit year
 *   - "by <username>" appended only when updated_by_name is present
 *   - Falls back to dateCreated when dateUpdated is missing
 */
import { formatLastModified } from '../page';

const baseRecord = {
  id: 'r1',
  companyFormId: 0,
  data: {},
  companyForm: { id: '1', name: 'Form', formType: 'deutz-service' },
};

describe('formatLastModified', () => {
  it('formats date as DD-MMM-YY (uppercase month, padded day, 2-digit year)', () => {
    const out = formatLastModified({
      ...baseRecord,
      dateCreated: '2025-01-05T10:00:00Z',
      dateUpdated: '2025-03-09T10:00:00Z',
      updated_by_name: 'Hannah Mongaya',
    } as any);
    // 2025-03-09 → 09-MAR-25
    expect(out).toBe('09-MAR-25 by Hannah Mongaya');
  });

  it('uses dateCreated when dateUpdated is missing', () => {
    const out = formatLastModified({
      ...baseRecord,
      dateCreated: '2024-12-31T10:00:00Z',
      dateUpdated: '',
      updated_by_name: '',
    } as any);
    // Should still produce a valid date with no "by" suffix
    expect(out).toMatch(/^31-DEC-24$/);
  });

  it('omits "by <name>" when updated_by_name is empty', () => {
    const out = formatLastModified({
      ...baseRecord,
      dateCreated: '2025-07-04T00:00:00Z',
      dateUpdated: '2025-07-04T00:00:00Z',
      updated_by_name: '',
    } as any);
    expect(out).toBe('04-JUL-25');
  });

  it('returns empty string when both timestamps are missing', () => {
    const out = formatLastModified({ ...baseRecord, dateCreated: '', dateUpdated: '' } as any);
    expect(out).toBe('');
  });

  it('handles a single-digit day correctly', () => {
    const out = formatLastModified({
      ...baseRecord,
      dateCreated: '2025-08-09T12:00:00Z',
      dateUpdated: '2025-08-09T12:00:00Z',
      updated_by_name: 'Adam Admin',
    } as any);
    expect(out).toBe('09-AUG-25 by Adam Admin');
  });
});
