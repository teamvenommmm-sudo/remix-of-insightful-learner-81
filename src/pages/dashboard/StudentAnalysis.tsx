import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CognitiveBadge from "@/components/CognitiveBadge";

export default function StudentAnalysis() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (!roles?.length) { setLoading(false); return; }

      const userIds = roles.map((r) => r.user_id);
      const [profilesRes, cogRes, sessionsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
        supabase.from("cognitive_profiles").select("user_id, cognitive_type, confidence_score").in("user_id", userIds),
        supabase.from("session_logs").select("user_id, total_correct, total_questions_attempted").in("user_id", userIds),
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map((p) => [p.user_id, p]));
      const cogMap = Object.fromEntries((cogRes.data || []).map((c) => [c.user_id, c]));
      const sessionMap: Record<string, { correct: number; total: number; sessions: number }> = {};
      (sessionsRes.data || []).forEach((s) => {
        if (!sessionMap[s.user_id]) sessionMap[s.user_id] = { correct: 0, total: 0, sessions: 0 };
        sessionMap[s.user_id].correct += s.total_correct;
        sessionMap[s.user_id].total += s.total_questions_attempted;
        sessionMap[s.user_id].sessions += 1;
      });

      setStudents(userIds.map((id) => ({
        id,
        name: profileMap[id]?.display_name || "Unknown",
        cognitiveType: cogMap[id]?.cognitive_type || "Unclassified",
        accuracy: sessionMap[id]?.total ? Math.round((sessionMap[id].correct / sessionMap[id].total) * 100) : 0,
        sessions: sessionMap[id]?.sessions || 0,
      })));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Student Analysis</h1><p className="text-muted-foreground">Deep dive into individual student performance</p></div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Cognitive Type</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No students found</TableCell></TableRow>
              ) : (
                students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><CognitiveBadge type={s.cognitiveType} /></TableCell>
                    <TableCell>{s.accuracy}%</TableCell>
                    <TableCell>{s.sessions}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
