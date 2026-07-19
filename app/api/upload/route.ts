import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { getUserFileLimit, isUnlimitedLimit } from "@/lib/admin";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imagekit, userId: bodyUserId, parentId } = body;
    if (!imagekit || !imagekit.url) {
      return NextResponse.json({ error: "Invalid imagekit data" }, { status: 400 });
    }

    if (userId !== bodyUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = await getUserFileLimit(userId);

    if (!isUnlimitedLimit(limit)) {
      const userFiles = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.userId, userId),
            eq(files.isFolder, false),
            eq(files.isTrash, false)
          )
        );

      if (userFiles.length >= limit) {
        return NextResponse.json(
          { error: "File limit exceeded" },
          { status: 400 }
        );
      }
    }

    const fileData = {
      name: imagekit.name || "Untitled",
      path: imagekit.filePath || `/droply/${userId}/${imagekit.name}`,
      size: imagekit.size || 0,
      type: imagekit.fileType || "image",
      fileUrl: imagekit.url,
      fileId: imagekit.fileId || "",
      thumbnailUrl: imagekit.thumbnailUrl || "",
      userId: userId,
      parentId: parentId || "00000000-0000-0000-0000-000000000000",
      isFolder: false,
      isStarred: false,
      isTrash: false,
    };

    const [newfile] = await db.insert(files).values(fileData).returning();

    return NextResponse.json({ file: newfile }, { status: 200 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
