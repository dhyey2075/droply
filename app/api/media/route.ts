import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import {
  buildSearchCondition,
  buildSizeCondition,
  buildTypeCondition,
} from "@/lib/media/filters";
import { mediaQuerySchema } from "@/schemas/mediaQuerySchema";
import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * List the authenticated user's files.
 *
 * Query params (all optional):
 * - parentId  — scope to a folder (current-folder listing). Omit for all files.
 * - q|search  — case-insensitive name contains match (scoped with parentId when set)
 * - type      — all | folders | images | documents | videos | audio | other
 * - size      — all | small (<1MB) | medium (1–10MB) | large (>10MB)
 * - minSize / maxSize — byte bounds; override `size` when either is provided
 *
 * Search and filters are applied in SQL for the requested folder (not recursive).
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = mediaQuerySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { parentId, q, search, type, size, minSize, maxSize } = parsed.data;
    const nameQuery = q || search;

    const conditions: SQL[] = [
      eq(files.userId, userId),
      eq(files.isTrash, false),
    ];

    if (parentId) {
      conditions.push(eq(files.parentId, parentId));
    }

    const searchCondition = buildSearchCondition(nameQuery);
    if (searchCondition) conditions.push(searchCondition);

    const typeCondition = buildTypeCondition(type);
    if (typeCondition) conditions.push(typeCondition);

    const sizeCondition = buildSizeCondition({ size, minSize, maxSize });
    if (sizeCondition) conditions.push(sizeCondition);

    const media = await db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(desc(files.isFolder), asc(files.name));

    return NextResponse.json(media, { status: 200 });
  } catch (error) {
    console.error("Error fetching media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}
