import "server-only";

type MaterialDocumentKind = "Question" | "Message Manuscript";

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
};

type LineSegment = {
  text: string;
  x: number;
  width: number;
  fontSize: number;
};

type ParsedLine = {
  text: string;
  xStart: number;
  xEnd: number;
  center: boolean;
  fontSize: number;
  gapBefore: number;
  indentLevel: number;
};

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

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return Boolean(item) && typeof item === "object" && "str" in (item as PdfTextItem) && "transform" in (item as PdfTextItem);
}

function buildLineText(segments: LineSegment[]) {
  const sorted = [...segments].sort((left, right) => left.x - right.x);
  let text = "";
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

      if (gap > Math.max(3, segment.fontSize * 0.22) && !text.endsWith(" ")) {
        text += " ";
      }
    }

    if (segment.text.trim().length === 0) {
      if (!text.endsWith(" ")) {
        text += " ";
      }
    } else {
      text += segment.text;
      endX = segment.x + segment.width;
    }

    lastEnd = segment.x + segment.width;
  }

  return {
    text: normalizeText(text),
    xStart: firstX,
    xEnd: endX || firstX,
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

function renderMarkup(lines: ParsedLine[], kind: MaterialDocumentKind) {
  return lines
    .map((line) => {
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

      return `<div class="${classes.join(" ")}">${renderLineContent(line.text)}</div>`;
    })
    .join("");
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
  const lines: ParsedLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const lineMap = new Map<number, { y: number; segments: LineSegment[] }>();

    for (const item of textContent.items) {
      if (!isPdfTextItem(item)) {
        continue;
      }

      const rawText = item.str ?? "";
      const x = item.transform[4] ?? 0;
      const y = item.transform[5] ?? 0;
      const fontSize = Math.max(Math.abs(item.transform[0] ?? 0), Math.abs(item.height ?? 0), 12);
      const key = Math.round(y * 2) / 2;
      const bucket: { y: number; segments: LineSegment[] } = lineMap.get(key) ?? { y, segments: [] };
      bucket.segments.push({
        text: rawText,
        x,
        width: item.width ?? 0,
        fontSize,
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
          y: line.y,
          fontSize,
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
      const lineCenter = (line.xStart + line.xEnd) / 2;
      const isCentered = Math.abs(lineCenter - viewport.width / 2) <= 28 && line.xEnd - line.xStart < viewport.width * 0.75;
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
      });
    }
  }

  const markup = renderMarkup(lines, kind);
  return markup.length > 0 ? markup : null;
}
