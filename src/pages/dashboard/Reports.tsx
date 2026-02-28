import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CognitiveBadge from "@/components/CognitiveBadge";
import { FileText, Download } from "lucide-react";
import { downloadCSV, printPDF } from "@/lib/export-utils";

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [reportsRes, sessionsRes, topicsRes] = await Promise.all([
        supabase.from("performance_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("session_logs").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(50),
        supabase.from("topics").select("id, name"),
      ]);
      setReports(reportsRes.data || []);
      setSessions(sessionsRes.data || []);
      const tMap: Record<string, string> = {};
      (topicsRes.data || []).forEach(t => { tMap[t.id] = t.name; });
      setTopics(tMap);
      setLoading(false);
    };
    load();
  }, [user]);

  const exportSessionsCSV = () => {
    const data = sessions.map(s => ({
      Date: new Date(s.started_at).toLocaleDateString(),
      Topic: topics[s.topic_id] || "N/A",
      Questions: s.total_questions_attempted,
      Correct: s.total_correct,
      Accuracy: s.total_questions_attempted > 0 ? `${Math.round((s.total_correct / s.total_questions_attempted) * 100)}%` : "0%",
      Retries: s.total_retries,
      Duration: `${Math.round((s.session_duration_seconds || 0) / 60)}min`,
    }));
    downloadCSV(data, "cognilearn-sessions");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Performance reports and analytics</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportSessionsCSV} disabled={sessions.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => printPDF("report-content")} disabled={sessions.length === 0}>
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div id="report-content">
        {/* Session History Table */}
        <Card className="mb-6">
          <CardHeader><CardTitle>Session History</CardTitle></CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No sessions yet. Take a quiz to generate data!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="py-2 text-left font-medium text-muted-foreground">Topic</th>
                    <th className="py-2 text-left font-medium text-muted-foreground">Accuracy</th>
                    <th className="py-2 text-left font-medium text-muted-foreground">Retries</th>
                    <th className="py-2 text-left font-medium text-muted-foreground">Duration</th>
                  </tr></thead>
                  <tbody>
                    {sessions.slice(0, 10).map(s => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2">{new Date(s.started_at).toLocaleDateString()}</td>
                        <td className="py-2">{topics[s.topic_id] || "N/A"}</td>
                        <td className="py-2">{s.total_questions_attempted > 0 ? `${Math.round((s.total_correct / s.total_questions_attempted) * 100)}%` : "0%"}</td>
                        <td className="py-2">{s.total_retries}</td>
                        <td className="py-2">{Math.round((s.session_duration_seconds || 0) / 60)}min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {reports.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">AI Performance Reports</h2>
            {reports.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">{r.report_type} Report</CardTitle>
                    {r.cognitive_type_at_time && <CognitiveBadge type={r.cognitive_type_at_time} />}
                  </div>
                  <CardDescription>
                    {new Date(r.period_start).toLocaleDateString()} — {new Date(r.period_end).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-6">
                  {r.improvement_percentage !== null && (
                    <div><span className="text-sm text-muted-foreground">Improvement</span><p className="font-bold">{r.improvement_percentage > 0 ? "+" : ""}{r.improvement_percentage?.toFixed(1)}%</p></div>
                  )}
                  {r.retention_risk_score !== null && (
                    <div><span className="text-sm text-muted-foreground">Retention Risk</span>
                      <Badge variant={r.retention_risk_score > 0.7 ? "destructive" : r.retention_risk_score > 0.4 ? "secondary" : "default"}>
                        {(r.retention_risk_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
