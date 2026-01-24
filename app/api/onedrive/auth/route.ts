import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/onedrive/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: "OneDrive client ID not configured" },
        { status: 500 }
      );
    }

    const scopes = [
      "Files.Read",
      "Files.ReadWrite",
      "offline_access"
    ].join(" ");

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(userId)}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error generating OneDrive auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}

