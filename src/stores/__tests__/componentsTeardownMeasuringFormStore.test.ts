/**
 * Behavior tests for the add/delete-row APIs on the Components Teardown
 * Measuring form store. These power the "+ Add Row" and "× delete" buttons
 * across all measurement tables in the create form.
 */
import { useComponentsTeardownMeasuringFormStore } from '../componentsTeardownMeasuringFormStore';

// We exercise the store through its public API (no need to render React).
const getStore = () => useComponentsTeardownMeasuringFormStore.getState();

describe('componentsTeardownMeasuringFormStore — add/remove row', () => {
  beforeEach(() => {
    getStore().resetFormData();
  });

  it('addMeasurementRow appends a row to a measurement array', () => {
    const before = getStore().formData.cylinderBoreData.length;
    const newRow = {
      cylinder_no: 99,
      x_top: '1',
      x_middle: '2',
      x_bottom: '3',
      y_top: '4',
      y_middle: '5',
      y_bottom: '6',
    };
    getStore().addMeasurementRow('cylinderBoreData', newRow);
    const after = getStore().formData.cylinderBoreData;
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]).toMatchObject(newRow);
  });

  it('removeMeasurementRow drops the row at the given index', () => {
    // Seed with two rows
    getStore().addMeasurementRow('cylinderBoreData', {
      cylinder_no: 100,
      x_top: '', x_middle: '', x_bottom: '', y_top: '', y_middle: '', y_bottom: '',
    });
    getStore().addMeasurementRow('cylinderBoreData', {
      cylinder_no: 101,
      x_top: '', x_middle: '', x_bottom: '', y_top: '', y_middle: '', y_bottom: '',
    });
    const before = getStore().formData.cylinderBoreData;
    const targetIndex = before.findIndex((r: any) => r.cylinder_no === 100);
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    getStore().removeMeasurementRow('cylinderBoreData', targetIndex);

    const after = getStore().formData.cylinderBoreData;
    expect(after.length).toBe(before.length - 1);
    expect(after.some((r: any) => r.cylinder_no === 100)).toBe(false);
    expect(after.some((r: any) => r.cylinder_no === 101)).toBe(true);
  });

  it('add then remove leaves the section unchanged', () => {
    const initial = [...getStore().formData.cylinderBoreData];
    const row = {
      cylinder_no: 42,
      x_top: 'x', x_middle: '', x_bottom: '', y_top: '', y_middle: '', y_bottom: '',
    };
    getStore().addMeasurementRow('cylinderBoreData', row);
    const idx = getStore().formData.cylinderBoreData.length - 1;
    getStore().removeMeasurementRow('cylinderBoreData', idx);
    expect(getStore().formData.cylinderBoreData).toEqual(initial);
  });

  it('removeMeasurementRow with out-of-range index is a no-op', () => {
    const before = [...getStore().formData.cylinderBoreData];
    getStore().removeMeasurementRow('cylinderBoreData', 9999);
    expect(getStore().formData.cylinderBoreData).toEqual(before);
  });
});

describe('Components Teardown — edit form has add/delete row UI', () => {
  // Source-level assertion that the edit form keeps the row controls present.
  // Catches regressions like accidentally dropping the delete button or the
  // "+ Add Row" button.
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'components', 'EditComponentsTeardownMeasuring.tsx'),
    'utf8',
  );

  it('exposes an Add Row button calling handleAddRow', () => {
    expect(src).toMatch(/handleAddRow\s*\(/);
    expect(src).toMatch(/\+ Add Row/);
  });

  it('exposes a per-row remove button calling handleRemoveRow', () => {
    expect(src).toMatch(/handleRemoveRow\s*\(/);
    expect(src).toMatch(/title="Delete row"/);
  });
});
