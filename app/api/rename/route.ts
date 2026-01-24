import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileId, newName, userId: bodyUserId } = body;

        if (userId !== bodyUserId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (!fileId || !newName || typeof newName !== "string" || newName.trim() === "") {
            return NextResponse.json({ message: "Invalid file ID or name." }, { status: 400 });
        }

        // Check if file/folder exists and belongs to user
        const [existingFile] = await db
            .select()
            .from(files)
            .where(
                and(
                    eq(files.id, fileId),
                    eq(files.userId, bodyUserId)
                )
            );

        if (!existingFile) {
            return NextResponse.json({ message: "File or folder not found." }, { status: 404 });
        }

        // Update the name
        const [updatedFile] = await db
            .update(files)
            .set({
                name: newName.trim(),
                updatedAt: new Date()
            })
            .where(
                and(
                    eq(files.id, fileId),
                    eq(files.userId, bodyUserId)
                )
            )
            .returning();

        return NextResponse.json({
            success: true,
            message: `${existingFile.isFolder ? 'Folder' : 'File'} renamed successfully`,
            file: updatedFile,
        });
    } catch (error) {
        console.log("Error", error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}

