/**
 * Asserts the DTS "FOR SERVICE OFFICE ONLY" section is wired to permission-driven
 * dropdowns + Note gating, not hardcoded position names.
 *
 *   Checked By           → filterByPermission="dts_service_office.checked_by"
 *   Service Coordinator  → filterByPermission="dts_service_office.service_coordinator"
 *   Approved By          → filterByPermission="dts_service_office.approved_by"
 *   Service Manager      → filterByPermission="dts_service_office.service_manager"
 *   Note                 → disabled when user has none of the above (and not super admin)
 *
 * Behavioral filtering of SignatorySelect itself is already covered by
 * SignatorySelect.filterPositions.test.tsx.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (name: string) => readFileSync(join(root, name), 'utf8');

function block(src: string, name: string): string | null {
  const m = src.match(new RegExp(`<SignatorySelect[^/>]*\\bname="${name}"[^/]*/>`, 'm'));
  return m ? m[0] : null;
}
function noteBlock(src: string): string | null {
  const m = src.match(/<TextArea[^/>]*\bname="service_office_note"[^/]*\/>/m);
  return m ? m[0] : null;
}

describe('DTS — FOR SERVICE OFFICE ONLY uses filterByPermission + Note gating', () => {
  for (const file of ['DailyTimeSheetForm.tsx', 'EditDailyTimeSheet.tsx']) {
    const src = read(file);

    describe(file, () => {
      it('Checked By → filterByPermission="dts_service_office.checked_by" (Super Admin override)', () => {
        const b = block(src, 'checked_by')!;
        expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.checked_by"\}/);
      });
      it('Service Coordinator → filterByPermission="dts_service_office.service_coordinator"', () => {
        const b = block(src, 'service_coordinator')!;
        expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.service_coordinator"\}/);
      });
      it('Approved By → filterByPermission="dts_service_office.approved_by"', () => {
        const b = block(src, 'approved_by_service')!;
        expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.approved_by"\}/);
      });
      it('Service Manager → filterByPermission="dts_service_office.service_manager"', () => {
        const b = block(src, 'service_manager')!;
        expect(b).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"dts_service_office\.service_manager"\}/);
      });
      it('Note textarea is disabled when user has no service-office permission and is not super admin', () => {
        const b = noteBlock(src)!;
        expect(b).toMatch(/disabled=\{!canEncodeServiceOffice\s*&&\s*!isSuperAdmin\}/);
      });
    });
  }
});
