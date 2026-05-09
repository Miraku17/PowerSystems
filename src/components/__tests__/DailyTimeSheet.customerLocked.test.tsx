/**
 * Asserts that the Customer field on the Daily Time Sheet (create + edit) is
 * rendered as a disabled input. Reads the actual form source to verify the
 * structural property — guards against regressions that would re-enable editing.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function readForm(name: string) {
  return readFileSync(join(root, name), 'utf8');
}

describe('Daily Time Sheet — Customer field is locked', () => {
  it('create form: <Input name="customer" ... disabled />', () => {
    const src = readForm('DailyTimeSheetForm.tsx');
    // Find the <Input ... name="customer" ... /> block (multi-line)
    const m = src.match(/<Input[^>]*\bname="customer"[\s\S]*?\/>/m);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/\bdisabled\b/);
  });

  it('create form: no longer wraps Customer in a CustomerAutocomplete', () => {
    const src = readForm('DailyTimeSheetForm.tsx');
    // The Customer field is now a plain disabled Input, not the autocomplete.
    // Look for an autocomplete with name="customer" — should not exist.
    const m = src.match(/<CustomerAutocomplete[^>]*\bname="customer"[\s\S]*?\/>/m);
    expect(m).toBeNull();
  });

  it('edit form: <Input name="customer" ... disabled />', () => {
    const src = readForm('EditDailyTimeSheet.tsx');
    const m = src.match(/<Input[^>]*\bname="customer"[\s\S]*?\/>/m);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/\bdisabled\b/);
  });
});
