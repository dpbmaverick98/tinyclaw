import { getAgents, getTeams, getTasks } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function TasksPage() {
  const [agents, teams, tasks] = await Promise.all([
    getAgents().catch(() => ({} as Record<string, { name: string }>)),
    getTeams().catch(() => ({} as Record<string, { name: string }>)),
    getTasks().catch(() => [] as { id: string; title: string; status: string; assignee: string; assigneeType: string }[]),
  ]);

  const taskList = tasks || [];
  const byStatus = {
    backlog: taskList.filter((t) => t.status === "backlog"),
    in_progress: taskList.filter((t) => t.status === "in_progress"),
    review: taskList.filter((t) => t.status === "review"),
    done: taskList.filter((t) => t.status === "done"),
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            {taskList.length} task{taskList.length === 1 ? "" : "s"} total
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TaskColumn
          title="Backlog"
          tasks={byStatus.backlog}
          icon={ClipboardList}
          agents={agents}
          teams={teams}
        />
        <TaskColumn
          title="In Progress"
          tasks={byStatus.in_progress}
          icon={Clock}
          agents={agents}
          teams={teams}
        />
        <TaskColumn
          title="Review"
          tasks={byStatus.review}
          icon={AlertCircle}
          agents={agents}
          teams={teams}
        />
        <TaskColumn
          title="Done"
          tasks={byStatus.done}
          icon={CheckCircle2}
          agents={agents}
          teams={teams}
        />
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  icon: Icon,
  agents,
  teams,
}: {
  title: string;
  tasks: { id: string; title: string; assignee: string; assigneeType: string }[];
  icon: React.ComponentType<{ className?: string }>;
  agents: Record<string, { name: string }>;
  teams: Record<string, { name: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <Badge variant="secondary">{tasks.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks</p>
        ) : (
          tasks.map((task) => {
            const assigneeName =
              task.assigneeType === "agent"
                ? agents[task.assignee]?.name
                : teams[task.assignee]?.name;
            
            return (
              <div
                key={task.id}
                className="rounded-md border p-2 text-sm hover:bg-accent"
              >
                <p className="font-medium">{task.title}</p>
                {assigneeName && (
                  <p className="text-xs text-muted-foreground">@{assigneeName}</p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
