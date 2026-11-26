import { and, eq, gte, ilike, lte, not, or, type SQL } from "drizzle-orm";
import { files } from "@/lib/db/schema";
import type { MediaSizeFilter, MediaTypeFilter } from "@/schemas/mediaQuerySchema";

export const ROOT_FOLDER_ID = "00000000-0000-0000-0000-000000000000";

export const MEDIA_TYPE_OPTIONS: { value: MediaTypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "folders", label: "Folders" },
  { value: "images", label: "Images" },
  { value: "documents", label: "Documents" },
  { value: "videos", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "other", label: "Other" },
];

export const MEDIA_SIZE_OPTIONS: {
  value: MediaSizeFilter;
  label: string;
  description: string;
}[] = [
  { value: "all", label: "Any size", description: "No size filter" },
  { value: "small", label: "Small", description: "Under 1 MB" },
  { value: "medium", label: "Medium", description: "1 MB – 10 MB" },
  { value: "large", label: "Large", description: "Over 10 MB" },
];

/** Size bucket bounds in bytes. */
export const SIZE_BUCKETS: Record<
  Exclude<MediaSizeFilter, "all">,
  { min?: number; max?: number }
> = {
  small: { max: 1_000_000 - 1 },
  medium: { min: 1_000_000, max: 10_000_000 },
  large: { min: 10_000_000 + 1 },
};

const IMAGE_EXTENSIONS = [
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
] as const;

const DOCUMENT_EXTENSIONS = [
  "pdf",
  "docx",
  "doc",
  "txt",
  "md",
  "markdown",
  "csv",
  "rtf",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
] as const;

const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "wmv",
  "flv",
] as const;

const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "aac",
  "flac",
  "ogg",
  "m4a",
  "wma",
  "aiff",
] as const;

function nameEndsWithAny(extensions: readonly string[]): SQL | undefined {
  const clauses = extensions.map((ext) => ilike(files.name, `%.${ext}`));
  if (clauses.length === 0) return undefined;
  return or(...clauses);
}

/** ImageKit often stores type as "image" / "non-image"; also match by extension. */
function isImageCondition(): SQL {
  return or(
    eq(files.type, "image"),
    ilike(files.type, "image/%"),
    nameEndsWithAny(IMAGE_EXTENSIONS)
  )!;
}

function isDocumentCondition(): SQL {
  return or(
    ilike(files.type, "application/pdf%"),
    ilike(files.type, "application/msword%"),
    ilike(files.type, "application/vnd.openxmlformats%"),
    ilike(files.type, "text/%"),
    ilike(files.type, "application/rtf%"),
    nameEndsWithAny(DOCUMENT_EXTENSIONS)
  )!;
}

function isVideoCondition(): SQL {
  return or(
    eq(files.type, "video"),
    ilike(files.type, "video/%"),
    nameEndsWithAny(VIDEO_EXTENSIONS)
  )!;
}

function isAudioCondition(): SQL {
  return or(
    eq(files.type, "audio"),
    ilike(files.type, "audio/%"),
    nameEndsWithAny(AUDIO_EXTENSIONS)
  )!;
}

function isKnownMediaCategory(): SQL {
  return or(
    isImageCondition(),
    isDocumentCondition(),
    isVideoCondition(),
    isAudioCondition()
  )!;
}

/**
 * Build a SQL condition for a type category.
 * Categories are mutually exclusive for filtering UX (folders vs file kinds).
 */
export function buildTypeCondition(type: MediaTypeFilter): SQL | undefined {
  if (type === "all") return undefined;

  if (type === "folders") {
    return eq(files.isFolder, true);
  }

  const notFolder = eq(files.isFolder, false);

  if (type === "images") {
    return and(notFolder, isImageCondition());
  }
  if (type === "documents") {
    return and(notFolder, isDocumentCondition());
  }
  if (type === "videos") {
    return and(notFolder, isVideoCondition());
  }
  if (type === "audio") {
    return and(notFolder, isAudioCondition());
  }

  // other: non-folder files outside image/document/video/audio
  return and(notFolder, not(isKnownMediaCategory()));
}

/**
 * Size filters apply to files only (folders have size 0).
 * Explicit minSize/maxSize override the named bucket when either is set.
 */
export function buildSizeCondition(options: {
  size: MediaSizeFilter;
  minSize?: number;
  maxSize?: number;
}): SQL | undefined {
  const { size, minSize, maxSize } = options;
  const hasExplicit =
    typeof minSize === "number" || typeof maxSize === "number";

  let min = minSize;
  let max = maxSize;

  if (!hasExplicit) {
    if (size === "all") return undefined;
    const bucket = SIZE_BUCKETS[size];
    min = bucket.min;
    max = bucket.max;
  }

  const parts: SQL[] = [eq(files.isFolder, false)];
  if (typeof min === "number") parts.push(gte(files.size, min));
  if (typeof max === "number") parts.push(lte(files.size, max));

  if (parts.length === 1 && !hasExplicit && size === "all") {
    return undefined;
  }

  return and(...parts);
}

export function buildSearchCondition(query: string | undefined): SQL | undefined {
  const trimmed = query?.trim();
  if (!trimmed) return undefined;
  // Strip LIKE wildcards so user input is treated as a literal substring
  const literal = trimmed.replace(/[%_]/g, "");
  if (!literal) return undefined;
  return ilike(files.name, `%${literal}%`);
}
