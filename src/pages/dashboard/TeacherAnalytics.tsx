import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function TeacherAnalytics() {
  const [topicData, setTopicData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: topics } = await supabase.from("topics").select("id, name");
      if (!topics) { setLoading(false); return; }

      const { data: attempts } = await supabase.from("question_attempts").select("topic_id, is_correct");
      if (!attempts) { setLoading(false); return; }

      const topicMap: Record<string, { name: string; correct: number; total: number }> = {};
      topics.forEach((t) => { topicMap[t.id] = { name: t.name, correct: 0, total: 0 }; });
      attempts.forEach((a) => {
        if (a.topic_id && topicMap[a.topic_id]) {
          topicMap[a.topic_id].total++;
          if (a.is_correct) topicMap[a.topic_id].correct++;
        }
      });

      setTopicData(Object.values(topicMap).filter((t) => t.total > 0).map((t) => ({
        name: t.name,
        accuracy: Math.round((t.correct / t.total) * 100),
        attempts: t.total,
      })));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Analytics</h1><p className="text-muted-foreground">Class-wide performance analytics</p></div>

      <Card>
        <CardHeader><CardTitle>Topic Difficulty Index</CardTitle></CardHeader>
        <CardContent>
          {topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Accuracy %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-muted-foreground">No quiz data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
