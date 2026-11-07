import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { getTasksPageData } from "@/lib/tasks";
import { TasksBoard } from "./tasks-board";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [session, data] = await Promise.all([getServerSession(authOptions), getTasksPageData()]);

  return (
    <TasksBoard
      initialTasks={data.tasks}
      projects={data.projects}
      assignees={data.assignees}
      canEdit={canWrite(session?.user.role ?? "VIEWER", "/tasks")}
    />
  );
}
