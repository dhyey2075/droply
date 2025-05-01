import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import ImageKit from "imagekit";

export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    try {
        const { fileId, userId: bodyUserId } = body;
        if (userId !== bodyUserId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const response = await recursiveFileDeleter(fileId)
        const filesToDelete = response[0][0]
        const foldersToDelete = response[1][0]

        foldersToDelete.push(fileId)

        console.log(filesToDelete, foldersToDelete)

        // // Delete all files within the folder
        for(const folder of foldersToDelete){
            await db.delete(files).where(eq(files.id, folder))
        }
        const imagekit = new ImageKit({
            publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY|| "",
            urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
        });

        // Delete all files from db and ImageKit
        for (const fileId of filesToDelete) {
            // Get file info from db to retrieve file path/key for ImageKit
            const [fileRecord] = await db.select().from(files).where(eq(files.id, fileId));
            if (fileRecord && fileRecord.fileId) {
                try {
                    await imagekit.deleteFile(fileRecord.fileId);
                } catch (e) {
                    console.error(`Failed to delete file from ImageKit: ${fileRecord.fileId}`, e);
                }
            }
            await db.delete(files).where(eq(files.id, fileId));
        }
        

        return NextResponse.json({ message: "Folder and its contents deleted successfully" }, { status: 200 });
    } catch (error) {
        console.log(error)
        return NextResponse.json({error: error}, {status: 400})
    }
}

let filesToDelete: string[] = []

let foldersToDelete: string[] = []

const recursiveFileDeleter = async(folderId: string) => {

    const Files = await db.select().from(files).where(
        eq(files.parentId, folderId)
    )

    const foldersInFolder = Files.filter(file => file.isFolder).map(file => file.id)
    const filesInFolder = Files.filter(file => !file.isFolder).map(file => file.id)

    filesToDelete = [...filesToDelete, ...filesInFolder]
    foldersToDelete = [...foldersToDelete, ...foldersInFolder]

    for (const folder of foldersInFolder) {
        await recursiveFileDeleter(folder)
    }

    return [[filesToDelete], [foldersToDelete]]

}