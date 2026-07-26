import "server-only";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { rm, writeFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

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

function normalizeDocumentText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTextFromDocumentXml(xml: string) {
  const paragraphs = Array.from(xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)).map((match) => match[0]);

  const text = paragraphs
    .map((paragraph) =>
      paragraph
        .replace(/<w:tab\b[^>]*\/>/g, "\t")
        .replace(/<w:br\b[^>]*\/>/g, "\n")
        .replace(/<w:cr\b[^>]*\/>/g, "\n")
        .replace(/<[^>]+>/g, ""),
    )
    .map((paragraph) => decodeXmlEntities(paragraph).trim())
    .filter(Boolean)
    .join("\n\n");

  return normalizeDocumentText(text);
}

function isDocxFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function extractDocxTextFromFile(file: File) {
  if (!isDocxFile(file) || file.size === 0) {
    return null;
  }

  const tempPath = join(tmpdir(), `material-document-${randomUUID()}.docx`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    const { stdout } = await execFileAsync("unzip", ["-p", tempPath, "word/document.xml"], {
      maxBuffer: 8 * 1024 * 1024,
    });

    const extracted = extractTextFromDocumentXml(stdout);
    return extracted.length > 0 ? extracted : null;
  } catch {
    return null;
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}
