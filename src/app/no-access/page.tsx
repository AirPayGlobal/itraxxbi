import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { diagnoseAccess } from "@/lib/link-profile";
import { NoAccessView } from "./no-access-view";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const diagnosis = await diagnoseAccess(userId).catch((err: Error) => ({
    emails: [],
    project: "",
    reason: "database-error" as const,
    detail: err.message,
  }));
  if (diagnosis.reason === "ok") redirect("/");

  return <NoAccessView diagnosis={diagnosis} />;
}
