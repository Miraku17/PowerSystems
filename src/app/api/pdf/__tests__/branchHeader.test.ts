/**
 * Regression guard: jsPDF's default Helvetica WinAnsi encoding does not include
 * the U+2022 BULLET ("•") glyph, so any "•" passed to doc.text() is rendered as
 * "?" in the exported PDF. The branch-list header in the report footer must
 * use ASCII-safe separators only.
 *
 * This test scans every PDF backend route file and fails if any of them
 * contains "•" in the same line as one of the branch names — catching reverts.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const pdfDir = join(__dirname, '..');

function* walkPdfRouteFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      yield* walkPdfRouteFiles(p);
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      yield p;
    }
  }
}

describe('PDF route branch headers — no question-mark glyphs', () => {
  const offenders: string[] = [];
  for (const file of walkPdfRouteFiles(pdfDir)) {
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/NAVOTAS|BACOLOD|ZAMBOANGA/.test(line) && line.includes('•')) {
        offenders.push(`${file}:${i + 1}`);
      }
    });
  }

  it('no PDF route uses U+2022 (•) in the branches header', () => {
    expect(offenders).toEqual([]);
  });
});
