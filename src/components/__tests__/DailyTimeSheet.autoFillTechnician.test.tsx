/**
 * Asserts that the "Prepared By" SignatorySelect (formerly "Service
 * Technician/Engineer") on the Daily Time Sheet auto-fills for User 1
 * and User 2.
 *
 * Reads the actual form source so the structural property is verified —
 * the underlying behavior of `autoFillForPositions` itself is covered by
 * SignatorySelect.autoFill.test.tsx.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (name: string) => readFileSync(join(root, name), 'utf8');

function technicianBlock(src: string): string | null {
  // Capture the SignatorySelect block whose name="performed_by_name"
  const m = src.match(/<SignatorySelect[\s\S]*?\bname="performed_by_name"[\s\S]*?\/>/m);
  return m ? m[0] : null;
}

describe('Daily Time Sheet — auto-fill Prepared By for User 1/2', () => {
  it('create form: Prepared By SignatorySelect has autoFillForPositions=["User 1","User 2"]', () => {
    const block = technicianBlock(read('DailyTimeSheetForm.tsx'));
    expect(block).not.toBeNull();
    expect(block!).toMatch(/label="Prepared By"/);
    expect(block!).toMatch(/autoFillForPositions=\{\[\s*"User 1"\s*,\s*"User 2"\s*\]\}/);
  });

  // TODO(Task 6): re-enable once EditDailyTimeSheet is rewritten with the
  // new three-signatory layout. Currently the edit form still uses the
  // legacy "Service Technician/Engineer" label.
  it.skip('edit form: Prepared By SignatorySelect has autoFillForPositions=["User 1","User 2"]', () => {
    const block = technicianBlock(read('EditDailyTimeSheet.tsx'));
    expect(block).not.toBeNull();
    expect(block!).toMatch(/label="Prepared By"/);
    expect(block!).toMatch(/autoFillForPositions=\{\[\s*"User 1"\s*,\s*"User 2"\s*\]\}/);
  });
});
