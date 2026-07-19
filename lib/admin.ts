import { auth, clerkClient } from "@clerk/nextjs/server";

export const DEFAULT_FILE_LIMIT = 5;
export const UNLIMITED_FILE_LIMIT = -1;

type MetadataRecord = Record<string, unknown>;

type UserLike = {
  id: string;
  publicMetadata: MetadataRecord;
};

export function getFileLimitFromMetadata(
  publicMetadata: MetadataRecord | undefined | null
): number {
  const raw = publicMetadata?.permitted_no_of_files;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return DEFAULT_FILE_LIMIT;
}

export function isUnlimitedLimit(limit: number): boolean {
  return limit === UNLIMITED_FILE_LIMIT;
}

export function formatFileLimit(limit: number): string {
  return isUnlimitedLimit(limit) ? "Unlimited" : String(limit);
}

export function isAdminUser(user: { publicMetadata?: MetadataRecord | null }): boolean {
  return user.publicMetadata?.role === "admin";
}

export async function requireAdmin(): Promise<{ userId: string; user: UserLike }> {
  const { userId } = await auth();
  if (!userId) {
    throw new AdminAuthError("Unauthorized", 401);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (!isAdminUser(user)) {
    throw new AdminAuthError("Forbidden", 403);
  }

  return {
    userId,
    user: {
      id: user.id,
      publicMetadata: user.publicMetadata as MetadataRecord,
    },
  };
}

export async function getUserFileLimit(userId: string): Promise<number> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return getFileLimitFromMetadata(user.publicMetadata as MetadataRecord);
}

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}
