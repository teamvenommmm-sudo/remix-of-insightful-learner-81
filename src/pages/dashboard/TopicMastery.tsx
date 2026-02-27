import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Topic Mastery</h1><p className="text-muted-foreground">Track your progress across all topics</p></div>

      {performance.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No data yet. Take some quizzes to see your topic mastery!</CardContent></Card>
      ) : (
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
      )}
    </div>
  );
}
