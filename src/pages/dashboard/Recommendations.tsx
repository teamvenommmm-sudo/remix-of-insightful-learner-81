import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, Clock, BookOpen } from "lucide-react";

export default function Recommendations() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("recommendations").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => { setRecs(data || []); setLoading(false); });
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
          {recs.map((r) => (
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
