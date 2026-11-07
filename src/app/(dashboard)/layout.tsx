import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { CurrentUserProvider } from "@/components/providers/current-user";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // Signed in with Clerk but not invited, or deactivated.
  if (!user) redirect("/no-access");

  return (
    <CurrentUserProvider user={user}>
      <AppLayout>{children}</AppLayout>
    </CurrentUserProvider>
  );
}
