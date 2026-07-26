import "server-only";

type MaterialDocumentKind = "Question" | "Message Manuscript";

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL?: boolean;
};

type LineSegment = {
  text: string;
  x: number;
  width: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
};

type ParsedLine = {
  text: string;
  html: string;
  xStart: number;
  xEnd: number;
  center: boolean;
  fontSize: number;
  gapBefore: number;
  indentLevel: number;
  cells: TableCell[];
};

type RawParsedLine = ParsedLine & {
  y: number;
};

type TableCell = {
  text: string;
  html: string;
  xStart: number;
  xEnd: number;
};

type ParsedBlock =
  | { type: "line"; line: ParsedLine }
  | { type: "table"; rows: TableCell[][] };

type DOMMatrixLike = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  scaleSelf(scaleX: number, scaleY?: number): DOMMatrixLike;
  translateSelf(translateX?: number, translateY?: number): DOMMatrixLike;
};

function ensureDomMatrixPolyfill() {
  if (typeof globalThis.DOMMatrix !== "undefined") {
    return;
  }

  class SimpleDOMMatrix implements DOMMatrixLike {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;

    scaleSelf(scaleX: number, scaleY = scaleX) {
      this.a *= scaleX;
      this.d *= scaleY;
      return this;
    }

    translateSelf(translateX = 0, translateY = 0) {
      this.e += translateX;
      this.f += translateY;
      return this;
    }
  }

  globalThis.DOMMatrix = SimpleDOMMatrix as typeof DOMMatrix;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineHtml(text: string, isBold: boolean, isItalic: boolean) {
  let result = escapeHtml(text);

  if (isItalic) {
    result = `<em>${result}</em>`;
  }

  if (isBold) {
    result = `<strong>${result}</strong>`;
  }

  return result;
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return (
    Boolean(item) &&
    typeof item === "object" &&
    "str" in (item as PdfTextItem) &&
    "transform" in (item as PdfTextItem) &&
    "fontName" in (item as PdfTextItem)
  );
}

function getFontTraits(fontName: string) {
  return {
    isBold: fontName === "g_d0_f3" || fontName === "g_d0_f5" || fontName === "g_d0_f4",
    isItalic: fontName === "g_d0_f4" || fontName === "g_d0_f7",
  };
}

function buildCell(segments: LineSegment[]) {
  const sorted = [...segments].sort((left, right) => left.x - right.x);
  let text = "";
  let html = "";
  let lastEnd: number | null = null;
  let firstX = 0;
  let endX = 0;

  for (const segment of sorted) {
    if (!segment.text) {
      continue;
    }

    if (lastEnd === null) {
      firstX = segment.x;
    } else {
      const gap = segment.x - lastEnd;

      if (gap > Math.max(3, segment.fontSize * 0.22)) {
        if (!text.endsWith(" ")) {
          text += " ";
          html += " ";
        }
      }
    }

    const normalizedSegment = segment.text.replace(/\u00a0/g, " ");

    if (normalizedSegment.trim().length === 0) {
      if (!text.endsWith(" ")) {
        text += " ";
        html += " ";
      }
    } else {
      text += normalizedSegment;
      html += renderInlineHtml(normalizedSegment, segment.isBold, segment.isItalic);
      endX = segment.x + segment.width;
    }

    lastEnd = segment.x + segment.width;
  }

  return {
    text: normalizeText(text),
    html,
    xStart: firstX,
    xEnd: endX || firstX,
  };
}

function buildLineText(segments: LineSegment[]) {
  const sorted = [...segments].sort((left, right) => left.x - right.x);
  const cellGroups: LineSegment[][] = [];
  let currentCell: LineSegment[] = [];

  for (const segment of sorted) {
    if (!segment.text) {
      continue;
    }

    const previous = currentCell.at(-1);

    if (previous) {
      const gap = segment.x - (previous.x + previous.width);

      if (gap > 26) {
        cellGroups.push(currentCell);
        currentCell = [];
      }
    }

    currentCell.push(segment);
  }

  if (currentCell.length > 0) {
    cellGroups.push(currentCell);
  }

  const cells = cellGroups.map((group) => buildCell(group)).filter((cell) => cell.text.length > 0);
  const lineCell = buildCell(sorted);

  return {
    text: lineCell.text,
    html: lineCell.html,
    xStart: lineCell.xStart,
    xEnd: lineCell.xEnd,
    cells,
  };
}

function getIndentLevel(xStart: number, baseLeft: number) {
  const delta = Math.max(0, xStart - baseLeft);

  if (delta < 22) {
    return 0;
  }

  if (delta < 48) {
    return 1;
  }

  return 2;
}

function renderLineContent(text: string) {
  const match = text.match(/^((?:\d+|[IVXLC]+|[A-Z])\.)\s+(.*)$/);

  if (!match) {
    return escapeHtml(text);
  }

  return `<span class="material-doc-prefix">${escapeHtml(match[1])}</span><span class="material-doc-body">${escapeHtml(match[2])}</span>`;
}

function renderLineHtml(line: ParsedLine, kind: MaterialDocumentKind) {
  if (kind !== "Question") {
    return line.html;
  }

  return renderLineContent(line.text);
}

function startsStructuredBlock(text: string) {
  return /^((?:\d+|[IVXLC]+|[A-Z])\.)\s+/.test(text);
}

function isStandaloneReferenceLine(text: string) {
  return (
    /^Key Verse\b/i.test(text) ||
    /^[1-3]?\s?[A-Za-z]+\s+\d+:\d+(?:-\d+)?$/i.test(text)
  );
}

function isMergeableBodyLine(line: ParsedLine) {
  return !line.center && line.fontSize < 13.5;
}

function joinLineText(previous: string, current: string) {
  return `${previous} ${current}`
    .replace(/\s+/g, " ")
    .replace(/-\s+(\d+)/g, "-$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([,.;:?])/g, "$1")
    .trim();
}

function coalesceLines(lines: RawParsedLine[], kind: MaterialDocumentKind) {
  const merged: ParsedLine[] = [];

  for (const line of lines) {
    const previous = merged.at(-1);
    const startsBlock = startsStructuredBlock(line.text);

    if (
      previous &&
      isMergeableBodyLine(previous) &&
      isMergeableBodyLine(line) &&
      line.gapBefore <= 16 &&
      !startsBlock &&
      !(kind === "Question" && (isStandaloneReferenceLine(previous.text) || isStandaloneReferenceLine(line.text))) &&
      (kind === "Message Manuscript" || !startsStructuredBlock(previous.text) || line.xStart >= previous.xStart)
    ) {
      previous.text = joinLineText(previous.text, line.text);
      previous.html = `${previous.html} ${line.html}`.replace(/\s+/g, " ");
      previous.xEnd = Math.max(previous.xEnd, line.xEnd);
      continue;
    }

    merged.push({
      text: line.text,
      xStart: line.xStart,
      xEnd: line.xEnd,
      center: line.center,
      fontSize: line.fontSize,
      gapBefore: line.gapBefore,
      indentLevel: line.indentLevel,
      html: line.html,
      cells: line.cells,
    });
  }

  return merged;
}

function isLikelyTableLine(line: RawParsedLine) {
  return !line.center && line.fontSize <= 12.5 && line.cells.length >= 4;
}

function appendCellText(cell: TableCell, extra: TableCell) {
  cell.text = joinLineText(cell.text, extra.text);
  cell.html = `${cell.html}<br />${extra.html}`;
  cell.xEnd = Math.max(cell.xEnd, extra.xEnd);
}

function buildTableRows(lines: RawParsedLine[]) {
  const rows: TableCell[][] = [];
  const leftEdge = Math.min(...lines.flatMap((line) => line.cells.map((cell) => cell.xStart)));

  for (const line of lines) {
    const firstCell = line.cells[0];
    const startsNewRow = !firstCell || firstCell.xStart <= leftEdge + 16;

    if (startsNewRow || rows.length === 0) {
      rows.push(line.cells.map((cell) => ({ ...cell })));
      continue;
    }

    const currentRow = rows.at(-1);

    if (!currentRow) {
      continue;
    }

    for (const cell of line.cells) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < currentRow.length; index += 1) {
        const distance = Math.abs(currentRow[index].xStart - cell.xStart);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }

      appendCellText(currentRow[bestIndex], cell);
    }
  }

  return rows.filter((row) => row.length >= 4);
}

function buildBlocks(lines: RawParsedLine[], kind: MaterialDocumentKind) {
  if (kind !== "Message Manuscript") {
    return coalesceLines(lines, kind).map((line) => ({ type: "line", line }) satisfies ParsedBlock);
  }

  const blocks: ParsedBlock[] = [];
  let buffer: RawParsedLine[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) {
      return;
    }

    blocks.push(...coalesceLines(buffer, kind).map((line) => ({ type: "line", line }) satisfies ParsedBlock));
    buffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!isLikelyTableLine(line)) {
      buffer.push(line);
      continue;
    }

    flushBuffer();

    const tableLines: RawParsedLine[] = [line];
    let nextIndex = index + 1;

    while (nextIndex < lines.length) {
      const nextLine = lines[nextIndex];

      if (nextLine.gapBefore > 42 || nextLine.center || nextLine.cells.length < 3) {
        break;
      }

      tableLines.push(nextLine);
      nextIndex += 1;
    }

    const rows = buildTableRows(tableLines);

    if (rows.length >= 2) {
      blocks.push({ type: "table", rows });
      index = nextIndex - 1;
      continue;
    }

    buffer.push(...tableLines);
    index = nextIndex - 1;
  }

  flushBuffer();
  return blocks;
}

function renderMarkup(lines: RawParsedLine[], kind: MaterialDocumentKind) {
  return buildBlocks(lines, kind)
    .map((block) => {
      if (block.type === "table") {
        return `
          <div class="material-doc-table-wrap gap-lg">
            <table class="material-doc-table">
              <tbody>
                ${block.rows
                  .map(
                    (row) => `
                      <tr>
                        ${row.map((cell) => `<td>${cell.html}</td>`).join("")}
                      </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      const line = block.line;
      const classes = ["material-doc-line"];

      if (line.center) {
        classes.push("is-center");
      }

      if (line.fontSize >= 13.5) {
        classes.push("is-heading");
      }

      if (line.gapBefore >= 28) {
        classes.push("gap-xl");
      } else if (line.gapBefore >= 18) {
        classes.push("gap-lg");
      } else if (line.gapBefore >= 12) {
        classes.push("gap-md");
      }

      if (line.indentLevel > 0) {
        classes.push(`indent-${Math.min(line.indentLevel, 2)}`);
      }

      if (/^((?:\d+|[IVXLC]+|[A-Z])\.)\s+/.test(line.text)) {
        classes.push("has-prefix");
      }

      if (kind === "Question" && /^\d+\.\s+/.test(line.text)) {
        classes.push("is-question-row");
      }

      return `<div class="${classes.join(" ")}">${renderLineHtml(line, kind)}</div>`;
    })
    .join("");
}

function shouldCenterLine(
  xStart: number,
  xEnd: number,
  viewportWidth: number,
  fontSize: number,
  text: string,
) {
  const width = xEnd - xStart;
  const lineCenter = (xStart + xEnd) / 2;
  const centerDelta = Math.abs(lineCenter - viewportWidth / 2);

  return (
    fontSize >= 13.5 &&
    xStart >= viewportWidth * 0.22 &&
    width <= viewportWidth * 0.6 &&
    text.length <= 72 &&
    centerDelta <= 20
  );
}

export async function extractPdfDocumentMarkupFromFile(file: File, kind: MaterialDocumentKind) {
  const arrayBuffer = await file.arrayBuffer();
  ensureDomMatrixPolyfill();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  Object.defineProperty(pdfjs.PDFWorker, "_setupFakeWorkerGlobal", {
    value: Promise.resolve(worker.WorkerMessageHandler),
    configurable: true,
  });
  const document = await pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
  }).promise;
  const lines: RawParsedLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const lineMap = new Map<number, { y: number; segments: LineSegment[] }>();

    for (const item of textContent.items) {
      if (!isPdfTextItem(item)) {
        continue;
      }

      const textItem = item as PdfTextItem;
      const rawText = textItem.str ?? "";
      const x = textItem.transform[4] ?? 0;
      const y = textItem.transform[5] ?? 0;
      const fontSize = Math.max(Math.abs(textItem.transform[0] ?? 0), Math.abs(textItem.height ?? 0), 12);
      const key = Math.round(y * 2) / 2;
      const bucket: { y: number; segments: LineSegment[] } = lineMap.get(key) ?? { y, segments: [] };
      const traits = getFontTraits(textItem.fontName);
      bucket.segments.push({
        text: rawText,
        x,
        width: textItem.width ?? 0,
        fontSize,
        fontName: textItem.fontName,
        isBold: traits.isBold,
        isItalic: traits.isItalic,
      });
      lineMap.set(key, bucket);
    }

    const pageLines = [...lineMap.values()]
      .sort((left, right) => right.y - left.y)
      .map((line) => {
        const built = buildLineText(line.segments);
        const fontSize = Math.max(...line.segments.map((segment) => segment.fontSize), 12);
        return {
          text: built.text,
        xStart: built.xStart,
        xEnd: built.xEnd,
        html: built.html,
        y: line.y,
        fontSize,
        cells: built.cells,
      };
      })
      .filter((line) => line.text.length > 0)
      .filter((line) => !(line.y < 55 && /^\d+$/.test(line.text)));

    const xCandidates = pageLines
      .filter((line) => line.xStart > 24)
      .map((line) => line.xStart)
      .sort((left, right) => left - right);
    const baseLeft = xCandidates[0] ?? 0;

    let previousY = 0;

    for (const line of pageLines) {
      const isCentered = shouldCenterLine(line.xStart, line.xEnd, viewport.width, line.fontSize, line.text);
      const gapBefore = previousY === 0 ? 0 : Math.max(0, previousY - line.y);
      previousY = line.y;

      lines.push({
        text: line.text,
        xStart: line.xStart,
        xEnd: line.xEnd,
        center: isCentered,
        fontSize: line.fontSize,
        gapBefore,
        indentLevel: getIndentLevel(line.xStart, baseLeft),
        y: line.y,
        html: line.html,
        cells: line.cells,
      });
    }
  }

  const markup = renderMarkup(lines, kind);
  return markup.length > 0 ? markup : null;
}
