const INDEXABLE_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "txt",
  "md",
  "markdown",
  "csv",
  "rtf",
]);

const INDEXABLE_MIME_SNIPPETS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/rtf",
  "text/rtf",
];

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "heic",
  "heif",
  "tiff",
  "tif",
  "avif",
]);

function extensionFromName(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.toLowerCase().split(".");
  if (parts.length < 2) return null;
  return parts[parts.length - 1] ?? null;
}

export function isIndexableDocument(input: {
  name?: string | null;
  type?: string | null;
  isFolder?: boolean;
}): boolean {
  if (input.isFolder) return false;

  const ext = extensionFromName(input.name);
  if (ext && IMAGE_EXTENSIONS.has(ext)) return false;
  if (ext && INDEXABLE_EXTENSIONS.has(ext)) return true;

  const type = (input.type || "").toLowerCase();
  if (!type) return false;
  if (type === "folder" || type === "image" || type.startsWith("image/")) {
    return false;
  }
  if (INDEXABLE_EXTENSIONS.has(type)) return true;
  return INDEXABLE_MIME_SNIPPETS.some((snippet) => type.includes(snippet));
}

export function resolveIndexingStatus(input: {
  name?: string | null;
  type?: string | null;
  isFolder?: boolean;
}): "PENDING" | "INVALID" {
  return isIndexableDocument(input) ? "PENDING" : "INVALID";
}
