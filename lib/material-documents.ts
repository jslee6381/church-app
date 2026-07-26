import "server-only";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

function renderParagraph(paragraphXml: string, numberingMap: NumberingMap, counters: Map<string, number[]>) {
  const prefix = getParagraphNumberPrefix(paragraphXml, numberingMap, counters);
  const text = extractParagraphText(paragraphXml);
  const trimmed = text.trim();
  const indentStyle = prefix && prefix.level > 0 ? ` style="margin-left:${prefix.level * 1.25}rem"` : "";

  if (!trimmed && !prefix) {
    return `<div class="h-4"></div>`;
  }

  const prefixHtml = prefix
    ? `<span class="inline-block min-w-[2rem] pr-2 align-top font-semibold text-foreground">${escapeHtml(prefix.text)}</span>`
    : "";
  const textHtml = escapeHtml(text).replace(/\n/g, "<br />");

  return `<p class="ui-text m-0 whitespace-normal text-[15px] leading-7 text-foreground"${indentStyle}>${prefixHtml}<span>${textHtml || "&nbsp;"}</span></p>`;
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

async function unzipFileEntry(tempPath: string, filePath: string) {
  try {
    const { stdout } = await execFileAsync("unzip", ["-p", tempPath, filePath], {
      maxBuffer: 12 * 1024 * 1024,
    });

    return stdout;
  } catch {
    return "";
  }
}

async function extractMarkupWithTextutil(tempPath: string) {
  try {
    const { stdout } = await execFileAsync("/usr/bin/textutil", ["-convert", "html", "-stdout", tempPath], {
      maxBuffer: 16 * 1024 * 1024,
    });

    const markup = extractHtmlBody(stdout);
    return markup.length > 0 ? markup : null;
  } catch {
    return null;
  }
}

async function extractDocxMarkupFromPath(tempPath: string) {
  try {
    if (isLegacyDocPath(tempPath)) {
      return await extractMarkupWithTextutil(tempPath);
    }

    const [documentXml, numberingXml] = await Promise.all([
      unzipFileEntry(tempPath, "word/document.xml"),
      unzipFileEntry(tempPath, "word/numbering.xml"),
    ]);

    if (!documentXml) {
      return await extractMarkupWithTextutil(tempPath);
    }

    const extracted = extractDocumentMarkup(documentXml, numberingXml);
    if (extracted.length > 0) {
      return extracted;
    }

    return await extractMarkupWithTextutil(tempPath);
  } catch {
    return await extractMarkupWithTextutil(tempPath);
  }
}

export async function extractDocxTextFromFile(file: File) {
  if (!isSupportedWordFile(file) || file.size === 0) {
    return null;
  }

  const tempPath = join(tmpdir(), `material-document-${randomUUID()}.docx`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);
    return await extractDocxMarkupFromPath(tempPath);
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function extractDocxTextFromUrl(url: string) {
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
    await writeFile(tempPath, Buffer.from(arrayBuffer));
    return await extractDocxMarkupFromPath(tempPath);
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}
