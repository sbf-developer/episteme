import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".json", ".csv", ".html", ".xml", ".log", ".yml", ".yaml",
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".avif", ".ico",
]);

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".html": "text/html",
  ".xml": "application/xml",
  ".yml": "text/yaml",
  ".yaml": "text/yaml",
};

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function resolveMimeType(filename: string, reported: string) {
  if (reported && reported !== "application/octet-stream") return reported;
  const ext = path.extname(filename).toLowerCase();
  return EXT_MIME[ext] ?? (reported || "application/octet-stream");
}

export function isImageFile(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase();
  return mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(ext);
}

export function isPdfFile(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase();
  return mimeType === "application/pdf" || ext === ".pdf";
}

export function isDocxFile(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase();
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === ".docx"
  );
}

export function isAllowedFile(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase();
  const textMime =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    TEXT_EXTENSIONS.has(ext);
  if (
    textMime ||
    isImageFile(filename, mimeType) ||
    isPdfFile(filename, mimeType) ||
    isDocxFile(filename, mimeType)
  ) {
    return { ok: true as const };
  }
  return {
    ok: false as const,
    error:
      "Unsupported file type. Upload text, images, PDF, or Word (.docx) files.",
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function extractText(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (isImageFile(filename, mimeType)) {
    return `[Image: ${filename}]`;
  }

  if (isPdfFile(filename, mimeType)) {
    try {
      const text = await extractPdfText(buffer);
      return text || `[PDF: ${filename} — no extractable text]`;
    } catch {
      return `[PDF: ${filename} — text could not be extracted]`;
    }
  }

  if (isDocxFile(filename, mimeType)) {
    try {
      const text = await extractDocxText(buffer);
      return text || `[Word document: ${filename} — no extractable text]`;
    } catch {
      return `[Word document: ${filename} — text could not be extracted]`;
    }
  }

  return buffer.toString("utf-8");
}

export function getUploadDir() {
  return process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
}

export async function ensureUploadDir(userId: string) {
  const dir = path.join(getUploadDir(), userId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUploadedFile(
  userId: string,
  fileId: string,
  buffer: Buffer
): Promise<string> {
  const dir = await ensureUploadDir(userId);
  const storagePath = path.join(dir, fileId);
  await writeFile(storagePath, buffer);
  return storagePath;
}

export async function deleteStoredFile(storagePath: string) {
  try {
    await unlink(storagePath);
  } catch {
    // file may already be gone
  }
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  return readFile(storagePath);
}
