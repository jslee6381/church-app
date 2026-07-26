import "server-only";

import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

export type MaterialDocumentKind = "Question" | "Message Manuscript";

type NumberingLevel = {
  format: string;
};

type NumberingMap = Map<string, Map<number, NumberingLevel>>;

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractAttributeValue(xml: string, attribute: string) {
  const match = xml.match(new RegExp(`${attribute}="([^"]*)"`, "i"));
  return match?.[1] ?? null;
}

function normalizeDocumentMarkup(value: string) {
  return value.trim();
}

function extractHtmlBody(html: string) {
  const styleBlocks = Array.from(html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi))
    .map((match) => match[0])
    .join("\n");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch?.[1] ?? html;
  return normalizeDocumentMarkup(`${styleBlocks}${bodyContent}`);
}

function parseNumberingXml(xml: string) {
  const abstractLevels = new Map<string, Map<number, NumberingLevel>>();
  const abstractNums = Array.from(xml.matchAll(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g)).map((match) => match[0]);

  for (const abstractNum of abstractNums) {
    const abstractId = extractAttributeValue(abstractNum, "w:abstractNumId");

    if (!abstractId) {
      continue;
    }

    const levels = new Map<number, NumberingLevel>();
    const levelMatches = Array.from(abstractNum.matchAll(/<w:lvl\b[\s\S]*?<\/w:lvl>/g)).map((match) => match[0]);

    for (const levelXml of levelMatches) {
      const levelValue = extractAttributeValue(levelXml, "w:ilvl");

      if (!levelValue) {
        continue;
      }

      const formatValue = extractAttributeValue(levelXml, "w:val") ?? "decimal";
      levels.set(Number.parseInt(levelValue, 10), { format: formatValue });
    }

    abstractLevels.set(abstractId, levels);
  }

  const numberingMap: NumberingMap = new Map();
  const nums = Array.from(xml.matchAll(/<w:num\b[\s\S]*?<\/w:num>/g)).map((match) => match[0]);

  for (const numXml of nums) {
    const numId = extractAttributeValue(numXml, "w:numId");
    const abstractNumIdMatch = numXml.match(/<w:abstractNumId\b[^>]*w:val="([^"]+)"/);
    const abstractNumId = abstractNumIdMatch?.[1] ?? null;

    if (!numId || !abstractNumId) {
      continue;
    }

    numberingMap.set(numId, abstractLevels.get(abstractNumId) ?? new Map());
  }

  return numberingMap;
}

function formatListNumber(value: number, format: string) {
  if (format === "lowerLetter" || format === "upperLetter") {
    let current = value;
    let result = "";

    while (current > 0) {
      current -= 1;
      result = String.fromCharCode(65 + (current % 26)) + result;
      current = Math.floor(current / 26);
    }

    return format === "lowerLetter" ? result.toLowerCase() : result;
  }

  if (format === "lowerRoman" || format === "upperRoman") {
    const numerals: Array<[number, string]> = [
      [1000, "M"],
      [900, "CM"],
      [500, "D"],
      [400, "CD"],
      [100, "C"],
      [90, "XC"],
      [50, "L"],
      [40, "XL"],
      [10, "X"],
      [9, "IX"],
      [5, "V"],
      [4, "IV"],
      [1, "I"],
    ];

    let remaining = value;
    let result = "";

    for (const [amount, symbol] of numerals) {
      while (remaining >= amount) {
        result += symbol;
        remaining -= amount;
      }
    }

    return format === "lowerRoman" ? result.toLowerCase() : result;
  }

  if (format === "bullet") {
    return "•";
  }

  return String(value);
}

function getParagraphNumberPrefix(
  paragraphXml: string,
  numberingMap: NumberingMap,
  counters: Map<string, number[]>,
) {
  const numIdMatch = paragraphXml.match(/<w:numId\b[^>]*w:val="([^"]+)"/);
  const levelMatch = paragraphXml.match(/<w:ilvl\b[^>]*w:val="([^"]+)"/);
  const numId = numIdMatch?.[1] ?? null;

  if (!numId) {
    return null;
  }

  const level = Number.parseInt(levelMatch?.[1] ?? "0", 10);
  const formats = numberingMap.get(numId);
  const format = formats?.get(level)?.format ?? "decimal";
  const current = counters.get(numId) ?? [];
  current[level] = (current[level] ?? 0) + 1;
  current.length = level + 1;
  counters.set(numId, current);

  return {
    level,
    text: format === "bullet" ? "•" : `${formatListNumber(current[level], format)}.`,
  };
}

function extractParagraphText(paragraphXml: string) {
  const withBreaks = paragraphXml
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<w:cr\b[^>]*\/>/g, "\n");
  const textParts = Array.from(withBreaks.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)).map((match) => match[1]);
  return decodeXmlEntities(textParts.join("")).replace(/\u00a0/g, " ");
}

function formatTwipsToRem(value: number) {
  return `${(value / 1440) * 1.45}rem`;
}

function extractParagraphStyles(paragraphXml: string, hasPrefix: boolean) {
  const beforeMatch = paragraphXml.match(/<w:spacing\b[^>]*w:before="(\d+)"/);
  const afterMatch = paragraphXml.match(/<w:spacing\b[^>]*w:after="(\d+)"/);
  const leftMatch = paragraphXml.match(/<w:ind\b[^>]*w:left="(\d+)"/);
  const firstLineMatch = paragraphXml.match(/<w:ind\b[^>]*w:firstLine="(\d+)"/);
  const hangingMatch = paragraphXml.match(/<w:ind\b[^>]*w:hanging="(\d+)"/);
  const alignMatch = paragraphXml.match(/<w:jc\b[^>]*w:val="([^"]+)"/);

  const styles: string[] = [];
  const classNames: string[] = ["ui-text", "m-0", "text-[15px]", "leading-7", "text-foreground"];

  const before = beforeMatch ? Number.parseInt(beforeMatch[1], 10) : 0;
  const after = afterMatch ? Number.parseInt(afterMatch[1], 10) : 0;
  const left = leftMatch ? Number.parseInt(leftMatch[1], 10) : 0;
  const firstLine = firstLineMatch ? Number.parseInt(firstLineMatch[1], 10) : 0;
  const hanging = hangingMatch ? Number.parseInt(hangingMatch[1], 10) : 0;
  const align = alignMatch?.[1] ?? "left";

  if (before > 0) {
    styles.push(`margin-top:${formatTwipsToRem(before)}`);
  }

  if (after > 0) {
    styles.push(`margin-bottom:${formatTwipsToRem(after)}`);
  } else {
    styles.push("margin-bottom:0.55rem");
  }

  if (left > 0) {
    styles.push(`margin-left:${formatTwipsToRem(left)}`);
  }

  if (!hasPrefix && firstLine > 0) {
    styles.push(`text-indent:${formatTwipsToRem(firstLine)}`);
  }

  if (!hasPrefix && hanging > 0) {
    styles.push(`padding-left:${formatTwipsToRem(hanging)}`);
    styles.push(`text-indent:-${formatTwipsToRem(hanging)}`);
  }

  if (align === "center") {
    classNames.push("text-center");
  } else if (align === "right") {
    classNames.push("text-right");
  } else if (align === "both") {
    classNames.push("text-justify");
  }

  return {
    className: classNames.join(" "),
    style: styles.join(";"),
  };
}

function extractFormattedRuns(paragraphXml: string) {
  const runs = Array.from(paragraphXml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)).map((match) => match[0]);

  return runs
    .map((runXml) => {
      const fragments = Array.from(
        runXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\b[^>]*\/>|<w:cr\b[^>]*\/>|<w:tab\b[^>]*\/>/g),
      );

      if (fragments.length === 0) {
        return "";
      }

      const text = fragments
        .map((fragment) => {
          if (fragment[0].startsWith("<w:tab")) {
            return "\t";
          }

          if (fragment[0].startsWith("<w:br") || fragment[0].startsWith("<w:cr")) {
            return "\n";
          }

          return decodeXmlEntities(fragment[1] ?? "").replace(/\u00a0/g, " ");
        })
        .join("");

      if (!text) {
        return "";
      }

      const isBold = /<w:b(?:\b|\/>)/.test(runXml);
      const isItalic = /<w:i(?:\b|\/>)/.test(runXml);
      const isUnderline = /<w:u\b[^>]*w:val="(?!none)[^"]+"/.test(runXml) || /<w:u\/>/.test(runXml);
      const escaped = escapeHtml(text).replace(/\n/g, "<br />");

      if (!isBold && !isItalic && !isUnderline) {
        return escaped;
      }

      const classes = [
        isBold ? "font-semibold" : "",
        isItalic ? "italic" : "",
        isUnderline ? "underline" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `<span class="${classes}">${escaped}</span>`;
    })
    .join("");
}

function renderParagraph(paragraphXml: string, numberingMap: NumberingMap, counters: Map<string, number[]>) {
  const prefix = getParagraphNumberPrefix(paragraphXml, numberingMap, counters);
  const text = extractParagraphText(paragraphXml);
  const trimmed = text.trim();
  const { className, style } = extractParagraphStyles(paragraphXml, Boolean(prefix));

  if (!trimmed && !prefix) {
    return `<div style="height:0.9rem"></div>`;
  }

  const prefixHtml = prefix
    ? `<span class="inline-block min-w-[2rem] pr-2 align-top font-semibold text-foreground">${escapeHtml(prefix.text)}</span>`
    : "";
  const textHtml = extractFormattedRuns(paragraphXml) || `${escapeHtml(text).replace(/\n/g, "<br />")}`;

  return `<p class="${className}" style="${style}">${prefixHtml}<span>${textHtml || "&nbsp;"}</span></p>`;
}

function renderTableCell(cellXml: string, numberingMap: NumberingMap, counters: Map<string, number[]>) {
  const paragraphs = Array.from(cellXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)).map((match) => match[0]);
  const renderedParagraphs = paragraphs.map((paragraph) => renderParagraph(paragraph, numberingMap, counters)).join("");
  return `<td class="align-top border border-border/70 px-3 py-2">${renderedParagraphs || "&nbsp;"}</td>`;
}

function renderTable(tableXml: string, numberingMap: NumberingMap, counters: Map<string, number[]>) {
  const rows = Array.from(tableXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)).map((match) => match[0]);
  const renderedRows = rows
    .map((row) => {
      const cells = Array.from(row.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)).map((match) => match[0]);
      const renderedCells = cells.map((cell) => renderTableCell(cell, numberingMap, counters)).join("");
      return `<tr>${renderedCells}</tr>`;
    })
    .join("");

  return `<div class="overflow-x-auto"><table class="w-full border-collapse text-left text-[15px] leading-7 text-foreground">${renderedRows}</table></div>`;
}

function extractDocumentMarkup(documentXml: string, numberingXml: string) {
  const bodyMatch = documentXml.match(/<w:body\b[^>]*>([\s\S]*?)<\/w:body>/);
  const bodyXml = bodyMatch?.[1] ?? documentXml;
  const numberingMap = parseNumberingXml(numberingXml);
  const counters = new Map<string, number[]>();
  const blocks = Array.from(bodyXml.matchAll(/<(w:p|w:tbl)\b[\s\S]*?<\/\1>/g)).map((match) => match[0]);

  const rendered = blocks
    .map((block) =>
      block.startsWith("<w:tbl")
        ? renderTable(block, numberingMap, counters)
        : renderParagraph(block, numberingMap, counters),
    )
    .join("");

  return normalizeDocumentMarkup(rendered);
}

function isSupportedWordFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  );
}

function isLegacyDocPath(filePath: string) {
  return filePath.toLowerCase().endsWith(".doc");
}

function readUInt16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function extractZipEntry(buffer: Buffer, targetPath: string) {
  const targetBytes = Buffer.from(targetPath, "utf8");
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;

  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (readUInt32(buffer, i) !== eocdSignature) {
      continue;
    }

    const centralDirectoryOffset = readUInt32(buffer, i + 16);
    const totalEntries = readUInt16(buffer, i + 10);
    let offset = centralDirectoryOffset;

    for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
      if (readUInt32(buffer, offset) !== centralSignature) {
        return null;
      }

      const compressionMethod = readUInt16(buffer, offset + 10);
      const compressedSize = readUInt32(buffer, offset + 20);
      const fileNameLength = readUInt16(buffer, offset + 28);
      const extraLength = readUInt16(buffer, offset + 30);
      const commentLength = readUInt16(buffer, offset + 32);
      const localHeaderOffset = readUInt32(buffer, offset + 42);
      const fileNameStart = offset + 46;
      const fileNameEnd = fileNameStart + fileNameLength;
      const fileNameBytes = buffer.subarray(fileNameStart, fileNameEnd);

      if (fileNameBytes.equals(targetBytes)) {
        if (readUInt32(buffer, localHeaderOffset) !== localSignature) {
          return null;
        }

        const localFileNameLength = readUInt16(buffer, localHeaderOffset + 26);
        const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
        const dataEnd = dataStart + compressedSize;
        const compressed = buffer.subarray(dataStart, dataEnd);

        if (compressionMethod === 0) {
          return compressed.toString("utf8");
        }

        if (compressionMethod === 8) {
          return inflateRawSync(compressed).toString("utf8");
        }

        return null;
      }

      offset = fileNameEnd + extraLength + commentLength;
    }
  }

  return null;
}

function extractDocxMarkupFromBuffer(buffer: Buffer, kind: MaterialDocumentKind) {
  try {
    const documentXml = extractZipEntry(buffer, "word/document.xml");
    const numberingXml = extractZipEntry(buffer, "word/numbering.xml") ?? "";
    if (!documentXml) {
      return null;
    }

    if (kind === "Message Manuscript") {
      const extracted = extractDocumentMarkup(documentXml, numberingXml);
      if (extracted.length > 0) {
        return extracted;
      }
      return null;
    }

    const extracted = extractDocumentMarkup(documentXml, numberingXml);
    if (extracted.length > 0) {
      return extracted;
    }
  } catch {
    return null;
  }

  return null;
}

export async function extractDocxTextFromFile(file: File, kind: MaterialDocumentKind) {
  if (!isSupportedWordFile(file) || file.size === 0) {
    return null;
  }

  if (file.name.toLowerCase().endsWith(".doc") || file.type === "application/msword") {
    return null;
  }

  const tempPath = join(tmpdir(), `material-document-${randomUUID()}.docx`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);
    return extractDocxMarkupFromBuffer(buffer, kind);
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function extractDocxTextFromUrl(url: string, kind: MaterialDocumentKind) {
  if (!url.trim()) {
    return null;
  }

  const tempPath = join(tmpdir(), `material-document-${randomUUID()}.docx`);

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempPath, buffer);
    return extractDocxMarkupFromBuffer(buffer, kind);
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}
