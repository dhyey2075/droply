import {
  AdminAuthError,
  DEFAULT_FILE_LIMIT,
  formatFileLimit,
  getFileLimitFromMetadata,
  isUnlimitedLimit,
  requireAdmin,
  UNLIMITED_FILE_LIMIT,
} from "@/lib/admin";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type ClerkUserLike = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl?: string;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: Record<string, unknown>;
};

function serializeUser(user: ClerkUserLike) {
  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const limit = getFileLimitFromMetadata(user.publicMetadata);
  return {
    id: user.id,
    email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl ?? null,
    permitted_no_of_files: limit,
    limitLabel: formatFileLimit(limit),
    isUnlimited: isUnlimitedLimit(limit),
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const client = await clerkClient();
    const result = await client.users.getUserList({
      query: q,
      limit: 20,
      orderBy: "-created_at",
    });

    const users = result.data.map((user) =>
      serializeUser(user as ClerkUserLike)
    );

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin user search failed:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const unlimited = Boolean(body.unlimited);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const nextLimit = unlimited ? UNLIMITED_FILE_LIMIT : DEFAULT_FILE_LIMIT;

    const updated = await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        permitted_no_of_files: nextLimit,
      },
    });

    return NextResponse.json(serializeUser(updated as ClerkUserLike));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin user update failed:", error);
    return NextResponse.json(
      { error: "Failed to update user limit" },
      { status: 500 }
    );
  }
}
