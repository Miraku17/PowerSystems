/**
 * Asserts the Daily Time Sheet (create + edit) replaces the legacy "Address"
 * field with "Location of Unit" sourced from the selected JO request.
 *
 * Reads the actual form source files so refactors that re-introduce
 * `jo.address` or relabel back to "Address" trip the test.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (name: string) => readFileSync(join(root, name), 'utf8');

describe('Daily Time Sheet — Location of Unit (from JO)', () => {
  it('create form: handleJobOrderSelect sources address from jo.location_of_unit', () => {
    const src = read('DailyTimeSheetForm.tsx');
    expect(src).toMatch(/address:\s*jo\.location_of_unit\b/);
    expect(src).not.toMatch(/address:\s*jo\.address\b/);
  });

  it('create form: address Input is labeled "Location of Unit"', () => {
    const src = read('DailyTimeSheetForm.tsx');
    const m = src.match(/<Input[^>]*\bname="address"[\s\S]*?\/>/m);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/label="Location of Unit"/);
  });

  it('edit form: handleJobOrderSelect sources address from jo.location_of_unit', () => {
    const src = read('EditDailyTimeSheet.tsx');
    expect(src).toMatch(/address:\s*jo\.location_of_unit\b/);
    expect(src).not.toMatch(/address:\s*jo\.address\b/);
  });

  it('edit form: address Input is labeled "Location of Unit"', () => {
    const src = read('EditDailyTimeSheet.tsx');
    const m = src.match(/<Input[^>]*\bname="address"[\s\S]*?\/>/m);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/label="Location of Unit"/);
  });

  it('approved-JO API selects location_of_unit', () => {
    const src = readFileSync(
      join(__dirname, '..', '..', 'app', 'api', 'forms', 'job-order-request', 'approved', 'route.ts'),
      'utf8',
    );
    expect(src).toMatch(/\.select\([^)]*location_of_unit/);
  });

  it('ApprovedJobOrder type includes location_of_unit', () => {
    const src = readFileSync(join(root, 'JobOrderAutocomplete.tsx'), 'utf8');
    expect(src).toMatch(/location_of_unit\??:\s*string/);
  });
});
