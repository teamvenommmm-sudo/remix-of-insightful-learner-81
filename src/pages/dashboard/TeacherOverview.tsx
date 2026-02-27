import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Layers, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COGNITIVE_COLORS = [
  "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(199, 89%, 48%)", "hsl(262, 83%, 58%)",
  "hsl(0, 72%, 51%)", "hsl(326, 80%, 50%)", "hsl(45, 93%, 47%)", "hsl(0, 0%, 45%)",
];

export default function TeacherOverview() {
  const [stats, setStats] = useState({ students: 0, topics: 0, questions: 0 });
  const [cogDistribution, setCogDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [studentsRes, topicsRes, questionsRes, cogRes] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "student"),
        supabase.from("topics").select("id", { count: "exact" }),
        supabase.from("questions").select("id", { count: "exact" }),
        supabase.from("cognitive_profiles").select("cognitive_type"),
      ]);

      setStats({
        students: studentsRes.count || 0,
        topics: topicsRes.count || 0,
        questions: questionsRes.count || 0,
      });

      if (cogRes.data) {
        const counts: Record<string, number> = {};
        cogRes.data.forEach((p) => {
          counts[p.cognitive_type] = (counts[p.cognitive_type] || 0) + 1;
        });
        setCogDistribution(Object.entries(counts).map(([name, value]) => ({ name, value })));
      }
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

      <Card>
        <CardHeader><CardTitle>Cognitive Type Distribution</CardTitle></CardHeader>
        <CardContent>
          {cogDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={cogDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {cogDistribution.map((_, i) => (
                    <Cell key={i} fill={COGNITIVE_COLORS[i % COGNITIVE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-muted-foreground">No student cognitive profiles yet. Students need to complete quizzes first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
