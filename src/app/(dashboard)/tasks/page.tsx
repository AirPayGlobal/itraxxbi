import { getCurrentUser } from "@/lib/session";
import { canWrite } from "@/lib/permissions";
import { getTasksPageData } from "@/lib/tasks";
import { TasksBoard } from "./tasks-board";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [user, data] = await Promise.all([getCurrentUser(), getTasksPageData()]);

  return (
    <TasksBoard
      initialTasks={data.tasks}
      projects={data.projects}
      assignees={data.assignees}
      canEdit={canWrite(user?.role ?? "VIEWER", "/tasks")}
    />
  );
}
