import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { oneDriveTokens } from "@/lib/db/schema";
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
      .from(oneDriveTokens)
      .where(eq(oneDriveTokens.userId, userId));

    if (!tokenData) {
      return NextResponse.json(
        { error: "OneDrive not connected" },
        { status: 401 }
      );
    }

    // Check if token is expired and refresh if needed
    if (tokenData.expiryDate && tokenData.expiryDate < new Date()) {
      if (tokenData.refreshToken) {
        const clientId = process.env.ONEDRIVE_CLIENT_ID;
        const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/onedrive/callback`;

        const refreshResponse = await fetch(
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: clientId!,
              client_secret: clientSecret!,
              refresh_token: tokenData.refreshToken,
              redirect_uri: redirectUri,
              grant_type: "refresh_token",
            }),
          }
        );

        const newTokens = await refreshResponse.json();

        if (newTokens.access_token) {
          const newExpiryDate = newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000)
            : null;

          await db
            .update(oneDriveTokens)
            .set({
              accessToken: newTokens.access_token,
              refreshToken: newTokens.refresh_token || tokenData.refreshToken,
              expiryDate: newExpiryDate,
              updatedAt: new Date(),
            })
            .where(eq(oneDriveTokens.userId, userId));

          tokenData.accessToken = newTokens.access_token;
          tokenData.expiryDate = newExpiryDate;
        } else {
          return NextResponse.json(
            { error: "Token expired and refresh failed" },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }
    }

    // Fetch files from OneDrive using Microsoft Graph API
    const graphEndpoint = folderId === "root"
      ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
      : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

    const response = await fetch(graphEndpoint, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OneDrive API error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to fetch files" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const files = (data.value || []).map((file: {
      id: string;
      name: string;
      size?: number;
      folder?: { childCount?: number };
      file?: { mimeType?: string };
      webUrl?: string;
      createdDateTime?: string;
      lastModifiedDateTime?: string;
    }) => {
      const isFolder = !!file.folder;
      
      return {
        id: file.id,
        name: file.name,
        size: file.size || 0,
        type: isFolder ? "folder" : (file.file?.mimeType || "file"),
        fileUrl: file.webUrl || "",
        thumbnailUrl: "",
        userId: userId,
        parentId: folderId === "root" ? null : folderId,
        isFolder: isFolder,
        isStarred: false,
        isTrash: false,
        createdAt: file.createdDateTime || new Date().toISOString(),
        updatedAt: file.lastModifiedDateTime || new Date().toISOString(),
        onedriveId: file.id,
      };
    });

    return NextResponse.json({ files });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching OneDrive files:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch files" },
      { status: 500 }
    );
  }
}

