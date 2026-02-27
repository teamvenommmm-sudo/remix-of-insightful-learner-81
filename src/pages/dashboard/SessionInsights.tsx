import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function SessionInsights() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("session_logs").select("*").eq("user_id", user.id).order("started_at", { ascending: true }).limit(20)
      .then(({ data }) => { setSessions(data || []); setLoading(false); });
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
      )}
    </div>
  );
}
