import type jsPDF from "jspdf";

export interface GridField {
  label: string;
  value: any;
  span?: number;
}

export interface GridHelpersConfig {
  leftMargin: number;
  contentWidth: number;
  pageHeight: number;
  lightGray: number[];
  borderGray: number[];
  textGray: number[];
  getValue: (value: any) => string;
  getYPos: () => number;
  setYPos: (y: number) => void;
}

export function createGridHelpers(doc: jsPDF, config: GridHelpersConfig) {
  const {
    leftMargin,
    contentWidth,
    pageHeight,
    lightGray,
    borderGray,
    textGray,
    getValue,
    getYPos,
    setYPos,
  } = config;

  const minRowHeight = 14;
  const valueFontLineHeight = 3.5; // line height for font size 9 in mm

  // Calculate the height needed for a layout row based on its text content
  const calcRowHeight = (rowFields: GridField[], cols: number = 2) => {
    const colWidth = (contentWidth - 6) / cols;
    let maxLines = 1;
    rowFields.forEach((f) => {
      const span = f.span || 1;
      const maxW = span >= cols ? contentWidth - 6 : colWidth * span - 3;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(getValue(f.value), maxW);
      maxLines = Math.max(maxLines, lines.length);
    });
    return Math.max(minRowHeight, 7 + maxLines * valueFontLineHeight + 2);
  };

  // Group fields into layout rows and compute per-row heights
  const computeLayout = (fields: GridField[], cols: number = 2) => {
    const layoutRows: Array<{
      fields: GridField[];
      startIdx: number;
      endIdx: number;
      height: number;
    }> = [];
    let pending: GridField[] = [];
    let pendingStartIdx = 0;
    let col = 0;

    fields.forEach((field, i) => {
      const span = field.span || 1;
      if (span >= cols) {
        if (col > 0) {
          layoutRows.push({
            fields: [...pending],
            startIdx: pendingStartIdx,
            endIdx: i,
            height: calcRowHeight(pending, cols),
          });
          pending = [];
          col = 0;
        }
        pendingStartIdx = i;
        layoutRows.push({
          fields: [field],
          startIdx: i,
          endIdx: i + 1,
          height: calcRowHeight([field], cols),
        });
        pendingStartIdx = i + 1;
      } else {
        if (pending.length === 0) pendingStartIdx = i;
        pending.push(field);
        col += span;
        if (col >= cols) {
          layoutRows.push({
            fields: [...pending],
            startIdx: pendingStartIdx,
            endIdx: i + 1,
            height: calcRowHeight(pending, cols),
          });
          pending = [];
          pendingStartIdx = i + 1;
          col = 0;
        }
      }
    });
    if (pending.length > 0) {
      layoutRows.push({
        fields: pending,
        startIdx: pendingStartIdx,
        endIdx: fields.length,
        height: calcRowHeight(pending, cols),
      });
    }

    const totalHeight =
      layoutRows.reduce((sum, r) => sum + r.height, 0) + 4; // +4 padding
    return { layoutRows, totalHeight };
  };

  // Render a grid box at a given Y position. Returns the box height.
  const renderGridBox = (
    gridFields: GridField[],
    startY: number,
    cols: number = 2
  ): number => {
    const colWidth = (contentWidth - 6) / cols;
    const { layoutRows, totalHeight: boxHeight } = computeLayout(gridFields, cols);

    // Draw background
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.1);
    doc.rect(leftMargin, startY, contentWidth, boxHeight, "FD");

    // Render text
    let yOffset = startY + 3;
    layoutRows.forEach((row) => {
      let xOffset = leftMargin + 3;
      let colIdx = 0;
      row.fields.forEach((field) => {
        const span = field.span || 1;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, xOffset, yOffset + 3);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const maxWidth =
          span >= cols ? contentWidth - 6 : colWidth * span - 3;
        const lines = doc.splitTextToSize(getValue(field.value), maxWidth);
        doc.text(lines, xOffset, yOffset + 7);

        // Advance to next column position
        colIdx += span;
        if (colIdx < cols) {
          xOffset = leftMargin + 3 + colIdx * colWidth;
        }
      });
      yOffset += row.height;
    });

    return boxHeight;
  };

  // Add fields in a grid layout with automatic pagination
  const addFieldsGrid = (
    fields: Array<{ label: string; value: any; span?: number }>,
    cols: number = 2
  ): void => {
    let yPos = getYPos();
    const { layoutRows, totalHeight } = computeLayout(fields, cols);

    // Case 1: Fits entirely on current page
    if (yPos + totalHeight <= pageHeight - 20) {
      const actualHeight = renderGridBox(fields, yPos, cols);
      setYPos(yPos + actualHeight + 5);
      return;
    }

    // Case 2: Needs splitting across pages
    const availableHeight = pageHeight - 20 - yPos;
    let fitRows = 0;
    let heightSum = 4; // box padding
    for (const row of layoutRows) {
      if (heightSum + row.height > availableHeight) break;
      heightSum += row.height;
      fitRows++;
    }

    if (fitRows < 1) {
      // Not enough space for even 1 row - go to next page
      doc.addPage();
      yPos = 15;
      setYPos(yPos);
      const actualHeight = renderGridBox(fields, yPos, cols);
      setYPos(yPos + actualHeight + 5);
      return;
    }

    // Find field index to split at
    const splitFieldIdx = layoutRows[fitRows]?.startIdx ?? fields.length;
    if (splitFieldIdx === 0) {
      doc.addPage();
      setYPos(15);
      addFieldsGrid(fields, cols);
      return;
    }

    const firstPageFields = fields.slice(0, splitFieldIdx);
    const secondPageFields = fields.slice(splitFieldIdx);

    // Render first part on current page
    renderGridBox(firstPageFields, yPos, cols);

    // New page for remainder
    doc.addPage();
    setYPos(15);
    addFieldsGrid(secondPageFields, cols);
  };

  // Add a text area field with automatic text wrapping and pagination
  const addTextAreaField = (label: string, value: any): void => {
    let yPos = getYPos();
    const valueText = getValue(value);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(valueText, contentWidth - 6);
    const boxHeight = Math.max(lines.length * 4 + 8, 16);

    if (yPos + boxHeight > pageHeight - 20) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.1);
    doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(label, leftMargin + 3, yPos + 4);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(lines, leftMargin + 3, yPos + 8);

    setYPos(yPos + boxHeight + 5);
  };

  return { renderGridBox, addFieldsGrid, addTextAreaField };
}
