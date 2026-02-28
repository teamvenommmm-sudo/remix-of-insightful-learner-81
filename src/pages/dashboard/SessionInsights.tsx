import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const TOPIC_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function SessionInsights() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [topicTime, setTopicTime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [sessRes, attemptsRes, topicsRes] = await Promise.all([
        supabase.from("session_logs").select("*").eq("user_id", user.id).order("started_at", { ascending: true }).limit(20),
        supabase.from("question_attempts").select("topic_id, response_time_ms, is_correct").eq("user_id", user.id),
        supabase.from("topics").select("id, name"),
      ]);
      setSessions(sessRes.data || []);

      // Time per topic
      const topicMap: Record<string, string> = {};
      (topicsRes.data || []).forEach(t => { topicMap[t.id] = t.name; });
      const timeMap: Record<string, number> = {};
      (attemptsRes.data || []).forEach(a => {
        if (a.topic_id) {
          const name = topicMap[a.topic_id] || "Unknown";
          timeMap[name] = (timeMap[name] || 0) + (a.response_time_ms || 0);
        }
      });
      setTopicTime(Object.entries(timeMap).map(([name, ms]) => ({ name, minutes: Math.round(ms / 60000) || 1 })));

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const chartData = sessions.map((s, i) => ({
    session: i + 1,
    accuracy: s.total_questions_attempted > 0 ? Math.round((s.total_correct / s.total_questions_attempted) * 100) : 0,
    retries: s.total_retries,
    duration: Math.round((s.session_duration_seconds || 0) / 60),
  }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Session Insights</h1><p className="text-muted-foreground">Detailed view of your quiz sessions</p></div>

      {sessions.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No sessions yet. Take a quiz to see insights!</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Retry Behavior</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="session" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="retries" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Session Duration (min)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="session" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="duration" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {topicTime.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Time Spent per Topic</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={topicTime} dataKey="minutes" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, minutes }) => `${name}: ${minutes}m`}>
                      {topicTime.map((_, i) => <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
