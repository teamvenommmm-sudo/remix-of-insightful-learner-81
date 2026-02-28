import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, Clock, BookOpen } from "lucide-react";

export default function Recommendations() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<any[]>([]);
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [recsRes, topicsRes] = await Promise.all([
        supabase.from("recommendations").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(5),
        supabase.from("topics").select("id, name"),
      ]);
      setRecs(recsRes.data || []);
      const tMap: Record<string, string> = {};
      (topicsRes.data || []).forEach(t => { tMap[t.id] = t.name; });
      setTopics(tMap);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Recommendations</h1><p className="text-muted-foreground">Personalized learning strategies from AI</p></div>

      {recs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Lightbulb className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p>No recommendations yet. Complete a few quizzes and the AI will generate personalized strategies for you!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recs.map((r) => {
            const focusTopics: string[] = Array.isArray(r.focus_topics) ? r.focus_topics : [];
            const schedule = r.review_schedule && typeof r.review_schedule === "object" ? r.review_schedule : null;

            return (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Learning Strategy</CardTitle>
                    <Badge variant="outline">{r.cognitive_type}</Badge>
                  </div>
                  <CardDescription>{new Date(r.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {r.learning_strategy_summary && (
                    <div className="flex gap-3"><Lightbulb className="mt-0.5 h-5 w-5 text-primary shrink-0" /><p className="text-sm">{r.learning_strategy_summary}</p></div>
                  )}
                  {r.practice_type && (
                    <div className="flex gap-3"><Target className="mt-0.5 h-5 w-5 text-primary shrink-0" /><p className="text-sm"><strong>Practice:</strong> {r.practice_type}</p></div>
                  )}
                  {r.recommended_difficulty && (
                    <div className="flex gap-3"><BookOpen className="mt-0.5 h-5 w-5 text-primary shrink-0" /><p className="text-sm"><strong>Recommended Difficulty:</strong> {r.recommended_difficulty}/5</p></div>
                  )}
                  {r.time_limit_mode && (
                    <div className="flex gap-3"><Clock className="mt-0.5 h-5 w-5 text-primary shrink-0" /><p className="text-sm"><strong>Time Mode:</strong> {r.time_limit_mode}</p></div>
                  )}

                  {focusTopics.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Focus Topics:</p>
                      <div className="flex flex-wrap gap-2">
                        {focusTopics.map((t, i) => (
                          <Badge key={i} variant="secondary">{topics[t] || t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {schedule && Object.keys(schedule).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Review Schedule:</p>
                      <div className="grid grid-cols-7 gap-1">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                          <div key={day} className={`rounded p-2 text-center text-xs ${schedule[day.toLowerCase()] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
