import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TopicMastery() {
  const { user } = useAuth();
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("topic_performance")
      .select("*, topics(name)")
      .eq("user_id", user.id)
      .order("accuracy_rate", { ascending: true })
      .then(({ data }) => { setPerformance(data || []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const getColor = (accuracy: number) => {
    if (accuracy >= 80) return "bg-[hsl(var(--success))]";
    if (accuracy >= 60) return "bg-primary";
    if (accuracy >= 40) return "bg-[hsl(var(--warning))]";
    return "bg-destructive";
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Topic Mastery</h1><p className="text-muted-foreground">Track your progress across all topics</p></div>

      {performance.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No data yet. Take some quizzes to see your topic mastery!</CardContent></Card>
      ) : (
        <>
          {/* Heatmap Grid */}
          <Card>
            <CardHeader><CardTitle>Mastery Heatmap</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {performance.map((p) => {
                  const accuracy = Math.round((p.accuracy_rate || 0) * 100);
                  return (
                    <div key={p.id} className={cn("rounded-lg p-4 text-primary-foreground", getColor(accuracy))}>
                      <p className="font-semibold">{(p as any).topics?.name || "Unknown"}</p>
                      <p className="text-3xl font-bold">{accuracy}%</p>
                      <p className="text-xs opacity-80">{p.total_attempts} attempts · {p.total_correct} correct</p>
                      {p.avg_response_time_ms && (
                        <p className="text-xs opacity-80">Avg time: {Math.round(p.avg_response_time_ms / 1000)}s</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detail list */}
          <div className="space-y-4">
            {performance.map((p) => {
              const accuracy = Math.round((p.accuracy_rate || 0) * 100);
              return (
                <Card key={p.id}>
                  <CardContent className="flex items-center gap-6 py-4">
                    <div className="min-w-[150px]">
                      <p className="font-medium">{(p as any).topics?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{p.total_attempts} attempts</p>
                    </div>
                    <div className="flex-1">
                      <Progress value={accuracy} className="h-3" />
                    </div>
                    <Badge variant={accuracy >= 80 ? "default" : accuracy >= 50 ? "secondary" : "destructive"}>
                      {accuracy}%
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
