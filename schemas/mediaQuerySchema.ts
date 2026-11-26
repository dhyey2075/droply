import { z } from "zod";

export const mediaTypeFilterSchema = z.enum([
  "all",
  "folders",
  "images",
  "documents",
  "videos",
  "audio",
  "other",
]);

export const mediaSizeFilterSchema = z.enum([
  "all",
  "small",
  "medium",
  "large",
]);

/** Query params for GET /api/media — filters apply within the current folder. */
export const mediaQuerySchema = z.object({
  /** Scope listing to this parent folder id. Omit to return all of the user's files. */
  parentId: z.string().uuid().optional(),
  /** Case-insensitive substring match on file/folder name. */
  q: z.string().trim().max(200).optional(),
  search: z.string().trim().max(200).optional(),
  type: mediaTypeFilterSchema.default("all"),
  size: mediaSizeFilterSchema.default("all"),
  /** Optional byte bounds; take precedence over `size` when provided. */
  minSize: z.coerce.number().int().nonnegative().optional(),
  maxSize: z.coerce.number().int().nonnegative().optional(),
});

export type MediaTypeFilter = z.infer<typeof mediaTypeFilterSchema>;
export type MediaSizeFilter = z.infer<typeof mediaSizeFilterSchema>;
export type MediaQuery = z.infer<typeof mediaQuerySchema>;
