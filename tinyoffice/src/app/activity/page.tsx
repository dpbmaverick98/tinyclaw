import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Bot, MessageSquare, ArrowRight } from "lucide-react";

export default function ActivityPage() {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-muted-foreground">Real-time agent actions and events</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Event Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-medium">Activity feed</h3>
            <p className="text-sm text-muted-foreground">
              Real-time events will appear here as agents work
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
