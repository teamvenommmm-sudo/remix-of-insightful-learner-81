import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Zap, Clock, Battery, AlertTriangle } from "lucide-react";

export default function CognitiveEnergy() {
  const { user } = useAuth();
  const [energy, setEnergy] = useState<any>(null);
  const [misconceptions, setMisconceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [enRes, mcRes] = await Promise.all([
        supabase.from("energy_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("misconception_patterns").select("*").eq("user_id", user.id).order("frequency", { ascending: false }).limit(10),
      ]);
      setEnergy(enRes.data);
      setMisconceptions(mcRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const energyCurve: any[] = energy?.energy_curve_data && Array.isArray(energy.energy_curve_data) ? energy.energy_curve_data : [];
  const formatHour = (h: number) => `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cognitive Energy & Misconceptions</h1>
        <p className="text-muted-foreground">Optimize your study schedule and understand your mistake patterns</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Best Study Time</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{energy?.best_performance_hour != null ? formatHour(energy.best_performance_hour) : "N/A"}</div>
            <p className="text-xs text-muted-foreground">Peak cognitive performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{energy?.session_duration_recommendation_minutes || "N/A"} min</div>
            <p className="text-xs text-muted-foreground">Recommended session length</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fatigue Point</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{energy?.avg_session_fatigue_point_minutes || "N/A"} min</div>
            <p className="text-xs text-muted-foreground">Accuracy starts declining</p>
          </CardContent>
        </Card>
      </div>

      {energy?.accuracy_decay_rate && energy.accuracy_decay_rate > 0.1 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm">After {energy.avg_session_fatigue_point_minutes || 25} minutes, your accuracy drops by ~{Math.round(energy.accuracy_decay_rate * 100)}%. Consider shorter, more focused sessions.</p>
          </CardContent>
        </Card>
      )}

      {/* Energy Curve */}
      {energyCurve.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Performance by Time of Day</CardTitle><CardDescription>When you perform best</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={energyCurve}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tickFormatter={formatHour} />
                <YAxis domain={[0, 100]} />
                <Tooltip labelFormatter={formatHour} />
                <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Accuracy %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Misconception Patterns */}
      <Card>
        <CardHeader><CardTitle>Misconception Patterns</CardTitle><CardDescription>Your most common mistake clusters</CardDescription></CardHeader>
        <CardContent>
          {misconceptions.length > 0 ? (
            <div className="space-y-3">
              {misconceptions.map((mc) => {
                const clusters: string[] = Array.isArray(mc.confusion_cluster) ? mc.confusion_cluster : [];
                return (
                  <div key={mc.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{mc.misconception_type}</span>
                      <Badge variant="secondary">{mc.frequency}x observed</Badge>
                    </div>
                    {clusters.length > 0 && (
                      <p className="text-xs text-muted-foreground">{clusters.join("; ")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">No misconception patterns detected yet. Keep taking quizzes!</p>
          )}
        </CardContent>
      </Card>

      {!energy && misconceptions.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Complete more quizzes to build your energy profile and misconception analysis.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
