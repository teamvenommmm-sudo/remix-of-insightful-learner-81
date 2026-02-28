import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Layers, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COGNITIVE_COLORS = [
  "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(199, 89%, 48%)", "hsl(262, 83%, 58%)",
  "hsl(0, 72%, 51%)", "hsl(326, 80%, 50%)", "hsl(45, 93%, 47%)", "hsl(0, 0%, 45%)",
];

export default function TeacherOverview() {
  const [stats, setStats] = useState({ students: 0, topics: 0, questions: 0 });
  const [cogDistribution, setCogDistribution] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [topicDifficulty, setTopicDifficulty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [studentsRes, topicsRes, questionsRes, cogRes, sessionsRes, profilesRes, topicListRes, attemptsRes] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "student"),
        supabase.from("topics").select("id", { count: "exact" }),
        supabase.from("questions").select("id", { count: "exact" }),
        supabase.from("cognitive_profiles").select("cognitive_type"),
        supabase.from("session_logs").select("user_id, total_correct, total_questions_attempted"),
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("topics").select("id, name"),
        supabase.from("question_attempts").select("topic_id, is_correct"),
      ]);

      setStats({ students: studentsRes.count || 0, topics: topicsRes.count || 0, questions: questionsRes.count || 0 });

      if (cogRes.data) {
        const counts: Record<string, number> = {};
        cogRes.data.forEach((p) => { counts[p.cognitive_type] = (counts[p.cognitive_type] || 0) + 1; });
        setCogDistribution(Object.entries(counts).map(([name, value]) => ({ name, value })));
      }

      // At-risk students (accuracy below 40%)
      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.display_name]));
      const studentAccuracy: Record<string, { correct: number; total: number }> = {};
      (sessionsRes.data || []).forEach(s => {
        if (!studentAccuracy[s.user_id]) studentAccuracy[s.user_id] = { correct: 0, total: 0 };
        studentAccuracy[s.user_id].correct += s.total_correct;
        studentAccuracy[s.user_id].total += s.total_questions_attempted;
      });
      setAtRiskStudents(
        Object.entries(studentAccuracy)
          .filter(([, d]) => d.total > 0 && (d.correct / d.total) < 0.4)
          .map(([id, d]) => ({ name: profileMap[id] || "Unknown", accuracy: Math.round((d.correct / d.total) * 100) }))
      );

      // Topic difficulty
      const topicMap: Record<string, { name: string; correct: number; total: number }> = {};
      (topicListRes.data || []).forEach(t => { topicMap[t.id] = { name: t.name, correct: 0, total: 0 }; });
      (attemptsRes.data || []).forEach(a => {
        if (a.topic_id && topicMap[a.topic_id]) {
          topicMap[a.topic_id].total++;
          if (a.is_correct) topicMap[a.topic_id].correct++;
        }
      });
      setTopicDifficulty(Object.values(topicMap).filter(t => t.total > 0).map(t => ({
        name: t.name, difficulty: 100 - Math.round((t.correct / t.total) * 100),
      })));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Class Overview</h1>
        <p className="text-muted-foreground">Monitor student performance and learning patterns</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.students}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Topics</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.topics}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.questions}</div></CardContent>
        </Card>
      </div>

      {atRiskStudents.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> At-Risk Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atRiskStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-destructive/5 p-3">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="destructive">{s.accuracy}% accuracy</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Cognitive Type Distribution</CardTitle></CardHeader>
          <CardContent>
            {cogDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={cogDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {cogDistribution.map((_, i) => <Cell key={i} fill={COGNITIVE_COLORS[i % COGNITIVE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-muted-foreground">No cognitive profiles yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Topic Difficulty Index</CardTitle></CardHeader>
          <CardContent>
            {topicDifficulty.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicDifficulty}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="difficulty" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Difficulty %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
