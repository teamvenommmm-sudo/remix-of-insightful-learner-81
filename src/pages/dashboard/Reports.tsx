import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CognitiveBadge from "@/components/CognitiveBadge";
import { FileText } from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("performance_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => { setReports(data || []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Performance reports and analytics</p></div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p>No reports generated yet. Reports are created after quiz sessions and AI analysis.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
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
  );
}
