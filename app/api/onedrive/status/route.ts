import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { oneDriveTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [tokenData] = await db
      .select()
      .from(oneDriveTokens)
      .where(eq(oneDriveTokens.userId, userId));

    return NextResponse.json({
      connected: !!tokenData,
      hasRefreshToken: !!tokenData?.refreshToken,
    });
  } catch (error) {
    console.error("Error checking OneDrive status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

