import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CognitiveBadge from "@/components/CognitiveBadge";
import { ChevronDown } from "lucide-react";

export default function StudentAnalysis() {
  const [students, setStudents] = useState<any[]>([]);
  const [topicPerf, setTopicPerf] = useState<Record<string, any[]>>({});
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (!roles?.length) { setLoading(false); return; }

      const userIds = roles.map((r) => r.user_id);
      const [profilesRes, cogRes, sessionsRes, topicPerfRes, topicsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
        supabase.from("cognitive_profiles").select("user_id, cognitive_type, confidence_score").in("user_id", userIds),
        supabase.from("session_logs").select("user_id, total_correct, total_questions_attempted").in("user_id", userIds),
        supabase.from("topic_performance").select("user_id, topic_id, accuracy_rate, avg_response_time_ms, total_attempts").in("user_id", userIds),
        supabase.from("topics").select("id, name"),
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

      // Topic performance per student
      const tpMap: Record<string, any[]> = {};
      (topicPerfRes.data || []).forEach(tp => {
        if (!tpMap[tp.user_id]) tpMap[tp.user_id] = [];
        tpMap[tp.user_id].push(tp);
      });
      setTopicPerf(tpMap);

      const tNames: Record<string, string> = {};
      (topicsRes.data || []).forEach(t => { tNames[t.id] = t.name; });
      setTopicNames(tNames);

      setStudents(userIds.map((id) => ({
        id,
        name: profileMap[id]?.display_name || "Unknown",
        cognitiveType: cogMap[id]?.cognitive_type || "Unclassified",
        confidence: cogMap[id]?.confidence_score,
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
                <TableHead></TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Cognitive Type</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No students found</TableCell></TableRow>
              ) : (
                students.map((s) => (
                  <Collapsible key={s.id} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell><ChevronDown className="h-4 w-4 text-muted-foreground" /></TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell><CognitiveBadge type={s.cognitiveType} /></TableCell>
                          <TableCell>
                            <Badge variant={s.accuracy >= 70 ? "default" : s.accuracy >= 40 ? "secondary" : "destructive"}>
                              {s.accuracy}%
                            </Badge>
                          </TableCell>
                          <TableCell>{s.sessions}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 px-8 py-4">
                            {topicPerf[s.id]?.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Topic Breakdown:</p>
                                {topicPerf[s.id].map((tp, i) => (
                                  <div key={i} className="flex items-center gap-4 text-sm">
                                    <span className="w-32 font-medium">{topicNames[tp.topic_id] || "Unknown"}</span>
                                    <Badge variant={Math.round((tp.accuracy_rate || 0) * 100) >= 70 ? "default" : "secondary"}>
                                      {Math.round((tp.accuracy_rate || 0) * 100)}%
                                    </Badge>
                                    <span className="text-muted-foreground">{tp.total_attempts} attempts</span>
                                    {tp.avg_response_time_ms && (
                                      <span className="text-muted-foreground">Avg: {Math.round(tp.avg_response_time_ms / 1000)}s</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No topic-level data available yet.</p>
                            )}
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
