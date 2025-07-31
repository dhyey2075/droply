import { NextRequest, NextResponse } from "next/server";
import ImageKit from "imagekit";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileId, userId: bodyUserId, originalFileId } = body;
        if (userId !== bodyUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const imagekit = new ImageKit({
            publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
            urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
        });

        if(!fileId) {
            try {
                await imagekit.deleteFile(originalFileId);
            } catch (e) {
                console.error(`Failed to delete file from ImageKit: ${originalFileId}`, e);
            }
        }

        // Get file info from db to retrieve file path/key for ImageKit
        const [fileRecord] = await db.select().from(files).where(eq(files.id, fileId));
        if (fileRecord && fileRecord.fileId) {
            try {
                await imagekit.deleteFile(fileRecord.fileId);
                await db.delete(files).where(eq(files.id, fileId));
            } catch (e) {
                console.error(`Failed to delete file from ImageKit: ${fileRecord.fileId}`, e);
            }
        }
        

        return NextResponse.json({ message: "Media deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting media:", error);
        return NextResponse.json(
            { error: "Failed to delete media" },
            { status: 500 }
        );
        
    }
}