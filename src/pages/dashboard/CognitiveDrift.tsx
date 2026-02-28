import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { AlertTriangle, Shield, Activity, TrendingDown } from "lucide-react";

export default function CognitiveDrift() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [fingerprint, setFingerprint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [histRes, evtRes, fpRes] = await Promise.all([
        supabase.from("cognitive_history").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(30),
        supabase.from("cognitive_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("behavioral_fingerprints").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setHistory(histRes.data || []);
      setEvents(evtRes.data || []);
      setFingerprint(fpRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const driftData = history.map((h, i) => ({
    index: i + 1,
    type: h.cognitive_type?.split(" ")[0] || "N/A",
    stability: h.stability_index ?? 50,
    confidence: (h.confidence_score ?? 0) * 100,
    date: new Date(h.created_at).toLocaleDateString(),
  }));

  const latestStability = history.length > 0 ? history[history.length - 1] : null;
  const cpi = fingerprint?.cognitive_predictability_index ?? null;
  const cpiLabel = fingerprint?.cpi_label ?? "N/A";

  const stabilityColor = (label: string) => {
    if (label === "Stable Thinker") return "text-green-600 dark:text-green-400";
    if (label === "Moderately Stable") return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cognitive Intelligence</h1>
        <p className="text-muted-foreground">Drift detection, predictability index, and behavioral fingerprint</p>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stability Index</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestStability?.stability_index?.toFixed(0) ?? "N/A"}</div>
            <p className={`text-xs font-medium ${stabilityColor(latestStability?.stability_label || "")}`}>
              {latestStability?.stability_label || "Not evaluated"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Predictability (CPI)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cpi !== null ? cpi.toFixed(0) : "N/A"}</div>
            <p className="text-xs text-muted-foreground">{cpiLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Type Changes</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length > 1 ? history.filter((h, i) => i > 0 && h.cognitive_type !== history[i - 1].cognitive_type).length : 0}</div>
            <p className="text-xs text-muted-foreground">across {history.length} evaluations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fingerprint ID</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono font-bold truncate">{fingerprint?.fingerprint_id || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Cognitive DNA</p>
          </CardContent>
        </Card>
      </div>

      {/* Drift alert */}
      {latestStability?.stability_label === "Unstable Cognitive Pattern" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm font-medium">Your learning pattern is fluctuating. Consider maintaining consistent study habits to stabilize your cognitive profile.</p>
          </CardContent>
        </Card>
      )}

      {/* Drift Timeline */}
      {driftData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Cognitive Drift Timeline</CardTitle><CardDescription>Stability and confidence over time</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={driftData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
                      <p className="font-semibold">{d?.date}</p>
                      <p>Stability: {d?.stability?.toFixed(0)}</p>
                      <p>Confidence: {d?.confidence?.toFixed(0)}%</p>
                      <p>Type: {d?.type}</p>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="stability" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} name="Stability" />
                <Line type="monotone" dataKey="confidence" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Confidence" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cognitive Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Cognitive Events</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant={e.event_type === "breakthrough" ? "default" : e.event_type === "stress" ? "destructive" : "secondary"}>
                    {e.event_type}
                  </Badge>
                  <div>
                    <p className="text-sm">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Behavioral Fingerprint Summary */}
      {fingerprint?.signature_summary && (
        <Card>
          <CardHeader><CardTitle>Behavioral Fingerprint</CardTitle><CardDescription>Your unique cognitive DNA signature</CardDescription></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{fingerprint.signature_summary}</p>
          </CardContent>
        </Card>
      )}

      {history.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Complete quizzes and cognitive analyses to build your drift timeline and behavioral fingerprint.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
