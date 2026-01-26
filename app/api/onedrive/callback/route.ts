import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { oneDriveTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get the base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.NEXT_PUBLIC_VERCEL_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This should be the userId

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=missing_code`
      );
    }

    // Get authenticated user
    const { userId: authenticatedUserId } = await auth();
    
    // Validate state format (Clerk userIds start with 'user_')
    if (!state.startsWith('user_')) {
      console.error("Invalid state parameter format:", state);
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=invalid_state`
      );
    }
    
    // In production, after OAuth redirect, the session might not be immediately available
    // Use the state parameter (which we control and set in auth route) as the userId
    // The state was set by us, so it's trusted
    const userId = state;
    
    // If we have an authenticated user, verify it matches state for security
    if (authenticatedUserId && authenticatedUserId !== state) {
      console.error("Security: State mismatch - authenticated user", authenticatedUserId, "does not match state", state);
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=unauthorized`
      );
    }
    
    // Log for debugging (remove in production if needed)
    if (!authenticatedUserId) {
      console.log("OAuth callback: Using state as userId (session not yet available):", userId);
    }

    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/onedrive/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?error=config_missing`
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
        `${baseUrl}/dashboard?error=no_token`
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

    return NextResponse.redirect(`${baseUrl}/dashboard?onedrive_connected=true`);
  } catch (error) {
    console.error("Error in OneDrive OAuth callback:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error details:", errorMessage);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.NEXT_PUBLIC_VERCEL_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=callback_failed&details=${encodeURIComponent(errorMessage)}`
    );
  }
}

