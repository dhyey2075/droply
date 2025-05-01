import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json({message: "Unauthorized"}, {status: 401})
        }
        const body = await request.json();
        const { name, userId: bodyUserId, parentId } = body

        if(userId !== bodyUserId){
            return NextResponse.json({message: "Unauthorized"}, {status: 401})
        }

        if(!name || typeof name != "string" || name.trim() === ""){
            return NextResponse.json({message: "Invalid Folder name."}, {status: 400})
        }

        // Special handling for root directory
        if(parentId !== "00000000-0000-0000-0000-000000000000") {
            const [parentFolder] = await db
                                    .select()
                                    .from(files)
                                    .where(
                                        and(
                                            eq(files.id, parentId),
                                            eq(files.userId, bodyUserId),
                                            eq(files.isFolder, true)
                                        )
                                    )
            if(!parentFolder){
                return NextResponse.json({message: "Parent folder not found."}, {status: 400})
            }
        }

        const folderData = {
            id: uuidv4(),
            name: name.trim(),
            path: `/folders/${userId}/${uuidv4()}`,
            size: 0,
            type: "folder",
            fileUrl: "",
            fileId: "",
            thumbnailUrl: "",
            userId,
            parentId: parentId || "00000000-0000-0000-0000-000000000000",
            isFolder: true,
            isStarred: false,
            isTrash: false,
          };
          const [newFolder] = await db.insert(files).values(folderData).returning();
          return NextResponse.json({
            success: true,
            message: "Folder created successfully",
            folder: newFolder,
        });
    } catch (error) {
        console.log("Error", error)
        return NextResponse.json({error: error}, {status: 500})
    }
}

