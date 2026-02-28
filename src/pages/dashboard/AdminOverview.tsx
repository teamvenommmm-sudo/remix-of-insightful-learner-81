import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Layers, Activity, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, students: 0, teachers: 0, topics: 0, questions: 0, sessions: 0 });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [sessionTrend, setSessionTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [usersRes, studentsRes, teachersRes, topicsRes, questionsRes, sessionsRes, recentRes, profilesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "student"),
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "teacher"),
        supabase.from("topics").select("id", { count: "exact" }),
        supabase.from("questions").select("id", { count: "exact" }),
        supabase.from("session_logs").select("id", { count: "exact" }),
        supabase.from("session_logs").select("user_id, started_at, total_correct, total_questions_attempted, topic_id").order("started_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("user_id, display_name"),
      ]);

      setStats({
        users: usersRes.count || 0, students: studentsRes.count || 0, teachers: teachersRes.count || 0,
        topics: topicsRes.count || 0, questions: questionsRes.count || 0, sessions: sessionsRes.count || 0,
      });

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.display_name]));
      setRecentSessions((recentRes.data || []).map(s => ({
        ...s, userName: profileMap[s.user_id] || "Unknown",
        accuracy: s.total_questions_attempted > 0 ? Math.round((s.total_correct / s.total_questions_attempted) * 100) : 0,
      })));

      // Session trend by date
      const { data: allSessions } = await supabase.from("session_logs").select("started_at").order("started_at", { ascending: true });
      const dayMap: Record<string, number> = {};
      (allSessions || []).forEach(s => {
        const day = new Date(s.started_at).toISOString().slice(0, 10);
        dayMap[day] = (dayMap[day] || 0) + 1;
      });
      setSessionTrend(Object.entries(dayMap).slice(-14).map(([date, count]) => ({ date: date.slice(5), sessions: count })));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Overview</h1>
        <p className="text-muted-foreground">Platform statistics and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Users</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.users}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Students</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.students}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Teachers</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.teachers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Topics</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.topics}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Questions</CardTitle><Layers className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.questions}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Sessions</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.sessions}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Session Activity Trend</CardTitle></CardHeader>
          <CardContent>
            {sessionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sessionTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-10 text-center text-muted-foreground">No session data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="font-medium">{s.userName}</span>
                    <span className="text-muted-foreground">{s.accuracy}% accuracy</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : <p className="py-10 text-center text-muted-foreground">No recent activity.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
