import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/export-utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function TeacherAnalytics() {
  const [topicData, setTopicData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [studentExport, setStudentExport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [topicsRes, attemptsRes, sessionsRes, profilesRes, cogRes, rolesRes] = await Promise.all([
        supabase.from("topics").select("id, name"),
        supabase.from("question_attempts").select("topic_id, is_correct, response_time_ms"),
        supabase.from("session_logs").select("user_id, started_at, total_correct, total_questions_attempted").order("started_at", { ascending: true }),
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("cognitive_profiles").select("user_id, cognitive_type"),
        supabase.from("user_roles").select("user_id, role").eq("role", "student"),
      ]);

      const topics = topicsRes.data || [];
      const attempts = attemptsRes.data || [];
      const sessions = sessionsRes.data || [];

      // Topic accuracy & avg response time
      const topicMap: Record<string, { name: string; correct: number; total: number; totalTime: number }> = {};
      topics.forEach((t) => { topicMap[t.id] = { name: t.name, correct: 0, total: 0, totalTime: 0 }; });
      attempts.forEach((a) => {
        if (a.topic_id && topicMap[a.topic_id]) {
          topicMap[a.topic_id].total++;
          topicMap[a.topic_id].totalTime += (a.response_time_ms || 0);
          if (a.is_correct) topicMap[a.topic_id].correct++;
        }
      });
      setTopicData(Object.values(topicMap).filter((t) => t.total > 0).map((t) => ({
        name: t.name,
        accuracy: Math.round((t.correct / t.total) * 100),
        avgTime: Math.round(t.totalTime / t.total / 1000),
        attempts: t.total,
      })));

      // Improvement trend (sessions over time)
      const weekMap: Record<string, { correct: number; total: number }> = {};
      sessions.forEach(s => {
        const week = new Date(s.started_at).toISOString().slice(0, 10);
        if (!weekMap[week]) weekMap[week] = { correct: 0, total: 0 };
        weekMap[week].correct += s.total_correct;
        weekMap[week].total += s.total_questions_attempted;
      });
      setTrendData(Object.entries(weekMap).slice(-15).map(([date, d]) => ({
        date: date.slice(5),
        accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
      })));

      // Student export data
      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.display_name]));
      const cogMap = Object.fromEntries((cogRes.data || []).map(c => [c.user_id, c.cognitive_type]));
      const studentSessions: Record<string, { correct: number; total: number; count: number }> = {};
      sessions.forEach(s => {
        if (!studentSessions[s.user_id]) studentSessions[s.user_id] = { correct: 0, total: 0, count: 0 };
        studentSessions[s.user_id].correct += s.total_correct;
        studentSessions[s.user_id].total += s.total_questions_attempted;
        studentSessions[s.user_id].count++;
      });
      setStudentExport((rolesRes.data || []).map(r => ({
        Name: profileMap[r.user_id] || "Unknown",
        "Cognitive Type": cogMap[r.user_id] || "Unclassified",
        Sessions: studentSessions[r.user_id]?.count || 0,
        Accuracy: studentSessions[r.user_id]?.total ? `${Math.round((studentSessions[r.user_id].correct / studentSessions[r.user_id].total) * 100)}%` : "N/A",
      })));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Analytics</h1><p className="text-muted-foreground">Class-wide performance analytics</p></div>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(studentExport, "student-data")} disabled={studentExport.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export Student Data
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Topic Accuracy</CardTitle></CardHeader>
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

        <Card>
          <CardHeader><CardTitle>Avg Response Time by Topic (s)</CardTitle></CardHeader>
          <CardContent>
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgTime" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Avg Time (s)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Class Accuracy Trend</CardTitle></CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-muted-foreground">No trend data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
