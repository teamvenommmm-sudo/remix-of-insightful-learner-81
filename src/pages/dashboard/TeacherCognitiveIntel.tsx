import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { AlertTriangle, Brain, Shield, Zap } from "lucide-react";

export default function TeacherCognitiveIntel() {
  const [students, setStudents] = useState<any[]>([]);
  const [misconceptions, setMisconceptions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [profilesRes, fpRes, cogRes, mcRes, evtRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("behavioral_fingerprints").select("user_id, cognitive_predictability_index, cpi_label, signature_summary"),
        supabase.from("cognitive_history").select("user_id, cognitive_type, stability_index, stability_label, created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("misconception_patterns").select("user_id, misconception_type, frequency").order("frequency", { ascending: false }).limit(50),
        supabase.from("cognitive_events").select("user_id, event_type, description, created_at").order("created_at", { ascending: false }).limit(20),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.display_name || "Unknown"; });

      // Build per-student data
      const studentMap: Record<string, any> = {};
      (fpRes.data || []).forEach((fp: any) => {
        studentMap[fp.user_id] = {
          name: profileMap[fp.user_id] || "Unknown",
          cpi: fp.cognitive_predictability_index,
          cpiLabel: fp.cpi_label,
          signature: fp.signature_summary,
        };
      });

      // Latest stability per student
      const latestStability: Record<string, any> = {};
      (cogRes.data || []).forEach((h: any) => {
        if (!latestStability[h.user_id]) {
          latestStability[h.user_id] = h;
        }
      });
      Object.entries(latestStability).forEach(([uid, h]: [string, any]) => {
        if (!studentMap[uid]) studentMap[uid] = { name: profileMap[uid] || "Unknown" };
        studentMap[uid].stability = h.stability_index;
        studentMap[uid].stabilityLabel = h.stability_label;
        studentMap[uid].latestType = h.cognitive_type;
      });

      setStudents(Object.entries(studentMap).map(([id, d]) => ({ id, ...d })));

      // Aggregate misconceptions
      const mcAgg: Record<string, number> = {};
      (mcRes.data || []).forEach((m: any) => {
        mcAgg[m.misconception_type] = (mcAgg[m.misconception_type] || 0) + m.frequency;
      });
      setMisconceptions(Object.entries(mcAgg).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 10));

      // Events with names
      setEvents((evtRes.data || []).map((e: any) => ({ ...e, name: profileMap[e.user_id] || "Unknown" })));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const unstableStudents = students.filter(s => s.stabilityLabel === "Unstable Cognitive Pattern");
  const stressEvents = events.filter(e => e.event_type === "stress");
  const breakthroughEvents = events.filter(e => e.event_type === "breakthrough");

  const stabilityData = students
    .filter(s => s.stability != null && s.cpi != null)
    .map(s => ({ name: s.name, stability: s.stability, cpi: s.cpi, size: 100 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cognitive Intelligence</h1>
        <p className="text-muted-foreground">Class-wide cognitive stability, predictability, and misconception analysis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unstable Students</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unstableStudents.length}</div>
            <p className="text-xs text-muted-foreground">Require intervention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Breakthroughs</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{breakthroughEvents.length}</div>
            <p className="text-xs text-muted-foreground">Recent positive shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stress Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stressEvents.length}</div>
            <p className="text-xs text-muted-foreground">Performance collapses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tracked Students</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Instability Alerts */}
      {unstableStudents.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Students Needing Intervention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unstableStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-destructive/5 p-3">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.latestType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">CSI: {s.stability?.toFixed(0)}</Badge>
                    {s.cpi != null && <Badge variant="outline">CPI: {s.cpi.toFixed(0)}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stability vs Predictability Map */}
      {stabilityData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Class Stability Map</CardTitle><CardDescription>Stability Index vs Predictability Index per student</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="stability" name="Stability" domain={[0, 100]} label={{ value: "Stability Index", position: "bottom" }} />
                <YAxis dataKey="cpi" name="CPI" domain={[0, 100]} label={{ value: "Predictability Index", angle: -90, position: "insideLeft" }} />
                <ZAxis dataKey="size" range={[60, 60]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-lg border bg-card p-2 shadow-md text-xs">
                      <p className="font-semibold">{d?.name}</p>
                      <p>CSI: {d?.stability?.toFixed(0)} | CPI: {d?.cpi?.toFixed(0)}</p>
                    </div>
                  );
                }} />
                <Scatter data={stabilityData} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Misconception Heatmap */}
      {misconceptions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Class Misconception Heatmap</CardTitle><CardDescription>Most common mistake patterns across all students</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={misconceptions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={150} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Cognitive Events</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.slice(0, 10).map((e) => (
                <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant={e.event_type === "breakthrough" ? "default" : e.event_type === "stress" ? "destructive" : "secondary"}>
                    {e.event_type}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-medium">{e.name}</span>: {e.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
