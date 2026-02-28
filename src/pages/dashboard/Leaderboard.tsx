import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Flame, Star } from "lucide-react";

const BADGE_ICONS: Record<string, React.ReactNode> = {
  "First Quiz": <Star className="h-3.5 w-3.5" />,
  "Perfect Score": <Trophy className="h-3.5 w-3.5" />,
  "Streak Master": <Flame className="h-3.5 w-3.5" />,
  "Topic Explorer": <Award className="h-3.5 w-3.5" />,
  "Speed Demon": <Medal className="h-3.5 w-3.5" />,
};

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: gamification } = await supabase
        .from("student_gamification")
        .select("user_id, total_points, current_streak, badges, quizzes_completed")
        .order("total_points", { ascending: false })
        .limit(50);

      if (!gamification?.length) { setLoading(false); return; }

      const userIds = gamification.map(g => g.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));

      setLeaders(gamification.map((g, i) => ({
        rank: i + 1,
        name: profileMap[g.user_id] || "Unknown",
        points: g.total_points,
        streak: g.current_streak,
        badges: Array.isArray(g.badges) ? g.badges as string[] : [],
        quizzes: g.quizzes_completed,
      })));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Top students by points earned</p>
      </div>

      {leaders.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          No leaderboard data yet. Complete quizzes to earn points!
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {leaders.map((l) => (
            <Card key={l.rank} className={l.rank <= 3 ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {l.rank <= 3 ? (
                    <Trophy className={`h-5 w-5 ${l.rank === 1 ? "text-yellow-500" : l.rank === 2 ? "text-gray-400" : "text-amber-600"}`} />
                  ) : l.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{l.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{l.quizzes} quizzes</span>
                    {l.streak > 0 && <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" />{l.streak} day streak</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {l.badges.map((b: string) => (
                    <Badge key={b} variant="secondary" className="text-xs gap-1">
                      {BADGE_ICONS[b] || <Star className="h-3 w-3" />}
                      {b}
                    </Badge>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{l.points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
