import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


export async function POST(request: NextResponse) {
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

        if(userId !== bodyUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
            parentId: parentId || "00000000-0000-0000-0000-000000000000", // Root level by default
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
