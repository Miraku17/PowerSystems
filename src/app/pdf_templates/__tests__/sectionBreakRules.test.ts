/**
 * Regression guard for the print/PDF break rules.
 *
 * The HTML PDF templates rely on these rules to keep section titles glued to
 * their content (so a "Signatures" header never appears alone at the bottom of
 * one page while its boxes flow to the next):
 *
 *   .section        → page-break-inside: avoid (+ modern break-inside: avoid)
 *   .section-header → page-break-after: avoid (+ modern break-after: avoid-page)
 *
 * If any template loses these rules the test fails.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = join(__dirname, '..');
const TEMPLATES = readdirSync(dir)
  .filter((f) => f.endsWith('.html'))
  .map((f) => join(dir, f));

function ruleAllowsBoth(src: string, selector: string, legacy: string, modern: string): boolean {
  // Find the FIRST CSS block for this selector and verify both declarations are present.
  // We look across the whole stylesheet — multiple blocks for the same selector are OK
  // as long as at least one block has each declaration somewhere in the file.
  const re = new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 'g');
  let m;
  let foundLegacy = false;
  let foundModern = false;
  while ((m = re.exec(src))) {
    const body = m[1];
    if (new RegExp(`\\b${legacy}\\b`).test(body)) foundLegacy = true;
    if (new RegExp(`\\b${modern}\\b`).test(body)) foundModern = true;
  }
  return foundLegacy && foundModern;
}

describe('PDF templates — section break rules keep titles with content', () => {
  expect(TEMPLATES.length).toBeGreaterThan(0);

  for (const path of TEMPLATES) {
    const name = path.split('/').pop();
    const src = readFileSync(path, 'utf8');

    describe(name, () => {
      it('.section has page-break-inside: avoid AND break-inside: avoid', () => {
        expect(ruleAllowsBoth(src, 'section', 'page-break-inside\\s*:\\s*avoid', 'break-inside\\s*:\\s*avoid')).toBe(true);
      });

      it('.section-header has page-break-after: avoid AND break-after: avoid-page', () => {
        expect(ruleAllowsBoth(src, 'section-header', 'page-break-after\\s*:\\s*avoid', 'break-after\\s*:\\s*avoid-page')).toBe(true);
      });
    });
  }
});
