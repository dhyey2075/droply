import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";

/** Completed, non-trash documents available for scoped Ask. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: files.id,
      name: files.name,
      parentId: files.parentId,
      type: files.type,
      chunkCount: files.chunkCount,
      indexedAt: files.indexedAt,
      isFolder: files.isFolder,
    })
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        eq(files.isTrash, false),
        eq(files.isFolder, false),
        eq(files.indexingStatus, "COMPLETED")
      )
    )
    .orderBy(asc(files.name));

  const folders = await db
    .select({
      id: files.id,
      name: files.name,
      parentId: files.parentId,
    })
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        eq(files.isTrash, false),
        eq(files.isFolder, true)
      )
    )
    .orderBy(asc(files.name));

  return NextResponse.json({ files: rows, folders });
}
