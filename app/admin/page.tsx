import { isAdminUser } from "@/lib/admin";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/signin");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  return <AdminPanel />;
}
