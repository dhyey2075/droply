import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { oneDriveTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This should be the userId

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_code", request.url)
      );
    }

    // Verify the state matches the authenticated user
    const { userId } = await auth();
    if (!userId || userId !== state) {
      return NextResponse.redirect(
        new URL("/dashboard?error=unauthorized", request.url)
      );
    }

    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/onedrive/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/dashboard?error=config_missing", request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return NextResponse.redirect(
        new URL("/dashboard?error=no_token", request.url)
      );
    }

    // Calculate expiry date
    const expiryDate = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Check if token already exists for this user
    const [existingToken] = await db
      .select()
      .from(oneDriveTokens)
      .where(eq(oneDriveTokens.userId, userId));

    const tokenData = {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenType: tokens.token_type || "Bearer",
      expiryDate,
      scope: tokens.scope || null,
      updatedAt: new Date(),
    };

    if (existingToken) {
      // Update existing token
      await db
        .update(oneDriveTokens)
        .set(tokenData)
        .where(eq(oneDriveTokens.userId, userId));
    } else {
      // Insert new token
      await db.insert(oneDriveTokens).values({
        ...tokenData,
        createdAt: new Date(),
      });
    }

    return NextResponse.redirect(new URL("/dashboard?onedrive_connected=true", request.url));
  } catch (error) {
    console.error("Error in OneDrive OAuth callback:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error details:", errorMessage);
    return NextResponse.redirect(
      new URL(`/dashboard?error=callback_failed&details=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}

