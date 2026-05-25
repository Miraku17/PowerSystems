/**
 * Asserts the DTS three-signatory layout is wired to permission-driven
 * dropdowns:
 *
 *   Checked By  → filterByPermission="dts_service_office.checked_by"
 *   Approved By → filterByPermission="dts_service_office.approved_by"
 *
 * Behavioral filtering of SignatorySelect itself is already covered by
 * SignatorySelect.filterPositions.test.tsx.
 *
 * Service Coordinator, Service Manager, and the service_office_note field
 * were removed in the 2026-05-25 redesign — their assertions are gone.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (name: string) => readFileSync(join(root, name), 'utf8');

function block(src: string, name: string): string | null {
  const m = src.match(new RegExp(`<SignatorySelect[^/>]*\\bname="${name}"[^/]*/>`, 'm'));
  return m ? m[0] : null;
}

describe('DTS — Checked By / Approved By use filterByPermission', () => {
  describe('DailyTimeSheetForm.tsx', () => {
    const src = read('DailyTimeSheetForm.tsx');

    it('Checked By → filterByPermission="dts_service_office.checked_by" (Super Admin override)', () => {
      const b = block(src, 'checked_by')!;
      expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.checked_by"\}/);
    });
    it('Approved By → filterByPermission="dts_service_office.approved_by"', () => {
      const b = block(src, 'approved_by_service')!;
      expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.approved_by"\}/);
    });
  });

  // TODO(Task 6): re-enable once EditDailyTimeSheet is rewritten with the
  // new three-signatory layout.
  describe.skip('EditDailyTimeSheet.tsx', () => {
    const src = read('EditDailyTimeSheet.tsx');

    it('Checked By → filterByPermission="dts_service_office.checked_by"', () => {
      const b = block(src, 'checked_by')!;
      expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.checked_by"\}/);
    });
    it('Approved By → filterByPermission="dts_service_office.approved_by"', () => {
      const b = block(src, 'approved_by_service')!;
      expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.approved_by"\}/);
    });
  });
});
