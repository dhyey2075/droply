import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { googleDriveTokens } from "@/lib/db/schema";
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

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/gdrive/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/dashboard?error=no_token", request.url)
      );
    }

    // Check if token already exists for this user
    const [existingToken] = await db
      .select()
      .from(googleDriveTokens)
      .where(eq(googleDriveTokens.userId, userId));

    const tokenData = {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenType: tokens.token_type || "Bearer",
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: Array.isArray(tokens.scope) ? tokens.scope.join(" ") : tokens.scope || null,
      updatedAt: new Date(),
    };

    if (existingToken) {
      // Update existing token
      await db
        .update(googleDriveTokens)
        .set(tokenData)
        .where(eq(googleDriveTokens.userId, userId));
    } else {
      // Insert new token
      await db.insert(googleDriveTokens).values({
        ...tokenData,
        createdAt: new Date(),
      });
    }

    return NextResponse.redirect(new URL("/dashboard?gdrive_connected=true", request.url));
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error details:", errorMessage);
    return NextResponse.redirect(
      new URL(`/dashboard?error=callback_failed&details=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}

