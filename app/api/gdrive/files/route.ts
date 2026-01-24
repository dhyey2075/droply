import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { googleDriveTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || "root";

    // Get stored tokens
    const [tokenData] = await db
      .select()
      .from(googleDriveTokens)
      .where(eq(googleDriveTokens.userId, userId));

    if (!tokenData) {
      return NextResponse.json(
        { error: "Google Drive not connected" },
        { status: 401 }
      );
    }

    // Check if token is expired and refresh if needed
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/gdrive/callback`
    );

    oauth2Client.setCredentials({
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken || undefined,
      expiry_date: tokenData.expiryDate ? tokenData.expiryDate.getTime() : undefined,
    });

    // Refresh token if expired
    if (tokenData.expiryDate && tokenData.expiryDate < new Date()) {
      if (tokenData.refreshToken) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        // Update token in database
        await db
          .update(googleDriveTokens)
          .set({
            accessToken: credentials.access_token || tokenData.accessToken,
            refreshToken: credentials.refresh_token || tokenData.refreshToken,
            expiryDate: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : tokenData.expiryDate,
            updatedAt: new Date(),
          })
          .where(eq(googleDriveTokens.userId, userId));
      } else {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Fetch files from Google Drive
    const response = await drive.files.list({
      q: folderId === "root" 
        ? "'root' in parents and trashed = false"
        : `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, size, mimeType, createdTime, modifiedTime, webViewLink, thumbnailLink, parents)",
      orderBy: "folder, name",
      pageSize: 100,
    });

    const files = (response.data.files || []).map((file) => {
      if (!file.id || !file.name) {
        return null;
      }
      
      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
      
      return {
        id: file.id,
        name: file.name,
        size: parseInt(file.size || "0"),
        type: isFolder ? "folder" : file.mimeType || "file",
        fileUrl: file.webViewLink || "",
        thumbnailUrl: file.thumbnailLink || "",
        userId: userId,
        parentId: folderId === "root" ? null : folderId,
        isFolder: isFolder,
        isStarred: false,
        isTrash: false,
        createdAt: file.createdTime || new Date().toISOString(),
        updatedAt: file.modifiedTime || new Date().toISOString(),
        gdriveId: file.id, // Store Google Drive ID for navigation
        gdriveParents: file.parents || [],
      };
    }).filter((file) => file !== null);

    return NextResponse.json({ files });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching Google Drive files:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch files" },
      { status: 500 }
    );
  }
}

