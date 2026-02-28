import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CognitiveBadge from "@/components/CognitiveBadge";
import { Activity, Brain, Target, TrendingUp, Trophy, Flame, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StudentOverview() {
  const { user } = useAuth();
  const [cogProfile, setCogProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [gamification, setGamification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [cogRes, sessRes, gamRes] = await Promise.all([
        supabase.from("cognitive_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("session_logs").select("*").eq("user_id", user.id).order("started_at", { ascending: true }).limit(20),
        supabase.from("student_gamification").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setCogProfile(cogRes.data);
      setSessions(sessRes.data || []);
      setGamification(gamRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  const accuracyData = sessions.map((s, i) => ({
    session: i + 1,
    accuracy: s.total_questions_attempted > 0 ? Math.round((s.total_correct / s.total_questions_attempted) * 100) : 0,
  }));

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const badges: string[] = gamification?.badges && Array.isArray(gamification.badges) ? gamification.badges : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your learning overview and cognitive profile</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cognitive Type</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CognitiveBadge type={cogProfile?.cognitive_type || "Unclassified"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.length > 0
                ? Math.round(
                    (sessions.reduce((a, s) => a + s.total_correct, 0) /
                      Math.max(sessions.reduce((a, s) => a + s.total_questions_attempted, 0), 1)) * 100
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyData.length >= 2
                ? `${accuracyData[accuracyData.length - 1].accuracy - accuracyData[0].accuracy > 0 ? "+" : ""}${accuracyData[accuracyData.length - 1].accuracy - accuracyData[0].accuracy}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gamification Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{gamification?.total_points || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gamification?.current_streak || 0} days</div>
            <p className="text-xs text-muted-foreground">Best: {gamification?.longest_streak || 0} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Badges</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {badges.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {badges.map((b) => <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Complete quizzes to earn badges!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {cogProfile?.reasoning && (
        <Card>
          <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{cogProfile.reasoning}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Accuracy Trend</CardTitle></CardHeader>
        <CardContent>
          {accuracyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="session" label={{ value: "Session", position: "insideBottom", offset: -5 }} />
                <YAxis domain={[0, 100]} label={{ value: "Accuracy %", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-muted-foreground">Take your first quiz to see your accuracy trend!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
