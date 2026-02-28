import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle2, XCircle, Lightbulb, SkipForward, Trophy, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import CognitiveModeIndicator from "@/components/CognitiveModeIndicator";

type QuizState = "select" | "active" | "results";
type Prediction = {
  predicted_response_time_ms: number;
  predicted_retry_probability: number;
  predicted_error_probability: number;
  predicted_mistake_type: string;
  predicted_hesitation_risk: number;
  confidence_instability: number;
} | null;

export default function TakeQuiz() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>("select");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState({ correct: 0, total: 0, retries: 0, pointsEarned: 0 });
  const [retries, setRetries] = useState(0);
  const startTimeRef = useRef<number>(0);
  const lastAttemptTimeRef = useRef<number>(0);
  const quizStartTimeRef = useRef<number>(0);
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [postQuizInsight, setPostQuizInsight] = useState<string | null>(null);
  const [allResponseTimes, setAllResponseTimes] = useState<number[]>([]);
  const [correctSoFar, setCorrectSoFar] = useState(0);
  const [totalSoFar, setTotalSoFar] = useState(0);

  useEffect(() => {
    supabase.from("topics").select("*").order("name").then(({ data }) => setTopics(data || []));
  }, []);

  const startQuiz = async () => {
    if (!selectedTopic || !user) return;
    const { data: qs } = await supabase.from("questions").select("*").eq("topic_id", selectedTopic).order("difficulty_level");
    if (!qs?.length) { toast({ title: "No questions", description: "This topic has no questions yet.", variant: "destructive" }); return; }

    const { data: session } = await supabase.from("session_logs").insert({
      user_id: user.id, topic_id: selectedTopic, total_questions_attempted: 0, total_correct: 0, total_retries: 0,
    }).select().single();

    setQuestions(qs);
    setSessionId(session?.id || null);
    setCurrentIdx(0);
    setResults({ correct: 0, total: 0, retries: 0, pointsEarned: 0 });
    setAllResponseTimes([]);
    setCorrectSoFar(0);
    setTotalSoFar(0);
    setQuizState("active");
    setPrediction(null);
    setPostQuizInsight(null);
    startTimeRef.current = Date.now();
    lastAttemptTimeRef.current = Date.now();
    quizStartTimeRef.current = Date.now();

    // Fetch shadow prediction for first question
    fetchPrediction(qs[0]);
  };

  const fetchPrediction = async (q: any) => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke("cognitive-intelligence", {
        body: { user_id: user.id, action: "predict", question_data: { topic_id: q.topic_id, difficulty_level: q.difficulty_level, hint: q.hint } },
      });
      if (data && !data.error) setPrediction(data);
    } catch { /* prediction is optional */ }
  };

  const handleAnswer = async (answer: string) => {
    if (answered || !user || !sessionId) return;
    const q = questions[currentIdx];
    const isCorrect = answer === q.correct_answer;
    const now = Date.now();
    const responseTime = now - startTimeRef.current;
    const timeBetween = retries > 0 ? now - lastAttemptTimeRef.current : null;

    await supabase.from("question_attempts").insert({
      user_id: user.id, session_id: sessionId, question_id: q.id, topic_id: q.topic_id,
      difficulty_level: q.difficulty_level, response_time_ms: responseTime,
      number_of_retries: retries, is_correct: isCorrect, hint_used: showHint,
      time_between_attempts_ms: timeBetween, abandonment_flag: false, selected_answer: answer,
    });

    setSelectedAnswer(answer);
    setAnswered(true);
    setAllResponseTimes(prev => [...prev, responseTime]);
    if (isCorrect) setCorrectSoFar(prev => prev + 1);
    setTotalSoFar(prev => prev + 1);

    // Compare prediction vs actual for cognitive events
    if (prediction && user && sessionId) {
      const deviationScore = Math.abs((prediction.predicted_error_probability > 0.5 ? 0 : 1) - (isCorrect ? 1 : 0));
      let eventType: string | null = null;
      if (prediction.predicted_error_probability > 0.6 && isCorrect) {
        eventType = "breakthrough";
        setPostQuizInsight("AI predicted you might struggle — but you got it right! 🎉");
      } else if (prediction.predicted_error_probability < 0.3 && !isCorrect) {
        eventType = "stress";
      }

      supabase.from("prediction_logs").insert({
        user_id: user.id, question_id: q.id, session_id: sessionId,
        predicted_response_time_ms: prediction.predicted_response_time_ms,
        predicted_retry_probability: prediction.predicted_retry_probability,
        predicted_error_probability: prediction.predicted_error_probability,
        predicted_mistake_type: prediction.predicted_mistake_type,
        predicted_hesitation_risk: prediction.predicted_hesitation_risk,
        actual_response_time_ms: responseTime, actual_is_correct: isCorrect, actual_retries: retries,
        deviation_score: deviationScore, event_type: eventType,
      }).then(() => {});

      if (eventType) {
        supabase.from("cognitive_events").insert({
          user_id: user.id, event_type: eventType, session_id: sessionId,
          description: eventType === "breakthrough"
            ? `Predicted ${Math.round(prediction.predicted_error_probability * 100)}% error probability but answered correctly`
            : `Unexpected failure despite ${Math.round((1 - prediction.predicted_error_probability) * 100)}% predicted success`,
        }).then(() => {});
      }
    }

    let pts = 0;
    if (isCorrect) {
      pts += 10;
      if (retries === 0) pts += 5;
      setResults((r) => ({ ...r, correct: r.correct + 1, total: r.total + 1, retries: r.retries + retries, pointsEarned: r.pointsEarned + pts }));
    } else {
      setResults((r) => ({ ...r, total: r.total + 1, retries: r.retries + retries }));
    }
  };

  const retryQuestion = () => {
    setSelectedAnswer(null);
    setAnswered(false);
    setRetries((r) => r + 1);
    lastAttemptTimeRef.current = Date.now();
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      finishQuiz();
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setSelectedAnswer(null);
      setAnswered(false);
      setShowHint(false);
      setRetries(0);
      setPrediction(null);
      setPostQuizInsight(null);
      startTimeRef.current = Date.now();
      lastAttemptTimeRef.current = Date.now();
      fetchPrediction(questions[nextIdx]);
    }
  };

  const skipQuestion = async () => {
    if (!user || !sessionId) return;
    const q = questions[currentIdx];
    await supabase.from("question_attempts").insert({
      user_id: user.id, session_id: sessionId, question_id: q.id, topic_id: q.topic_id,
      difficulty_level: q.difficulty_level, response_time_ms: Date.now() - startTimeRef.current,
      number_of_retries: 0, is_correct: false, hint_used: false, abandonment_flag: true, selected_answer: null,
    });
    setResults((r) => ({ ...r, total: r.total + 1 }));
    nextQuestion();
  };

  const finishQuiz = async () => {
    if (!sessionId || !user) return;
    const duration = Math.round((Date.now() - quizStartTimeRef.current) / 1000);
    
    const finalCorrect = results.correct;
    const finalTotal = results.total;
    const finalRetries = results.retries;
    let finalPoints = results.pointsEarned;

    // Perfect quiz bonus
    if (finalTotal > 0 && finalCorrect === finalTotal) finalPoints += 20;

    await supabase.from("session_logs").update({
      ended_at: new Date().toISOString(),
      total_questions_attempted: finalTotal,
      total_correct: finalCorrect,
      total_retries: finalRetries,
      session_duration_seconds: duration,
    }).eq("id", sessionId);

    // Update gamification
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("student_gamification")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const lastDate = existing.last_activity_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      let newStreak = lastDate === yesterday ? existing.current_streak + 1 : lastDate === today ? existing.current_streak : 1;
      if (newStreak > 1) finalPoints += 15; // streak bonus

      const newBadges = [...(Array.isArray(existing.badges) ? existing.badges as string[] : [])];
      const quizzesNow = existing.quizzes_completed + 1;
      if (quizzesNow === 1 && !newBadges.includes("First Quiz")) newBadges.push("First Quiz");
      if (finalTotal > 0 && finalCorrect === finalTotal && !newBadges.includes("Perfect Score")) newBadges.push("Perfect Score");
      if (newStreak >= 7 && !newBadges.includes("Streak Master")) newBadges.push("Streak Master");

      // Check Topic Explorer
      const { count } = await supabase.from("session_logs").select("topic_id", { count: "exact" }).eq("user_id", user.id);
      if ((count || 0) >= 5 && !newBadges.includes("Topic Explorer")) newBadges.push("Topic Explorer");

      await supabase.from("student_gamification").update({
        total_points: existing.total_points + finalPoints,
        current_streak: newStreak,
        longest_streak: Math.max(existing.longest_streak, newStreak),
        last_activity_date: today,
        badges: newBadges,
        quizzes_completed: quizzesNow,
      }).eq("user_id", user.id);
    } else {
      const newBadges: string[] = ["First Quiz"];
      if (finalTotal > 0 && finalCorrect === finalTotal) newBadges.push("Perfect Score");

      await supabase.from("student_gamification").insert({
        user_id: user.id,
        total_points: finalPoints,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        badges: newBadges,
        quizzes_completed: 1,
      });
    }

    setResults((r) => ({ ...r, pointsEarned: finalPoints }));

    // Trigger AI analysis (now uses cognitive-intelligence)
    supabase.functions.invoke("cognitive-intelligence", { body: { user_id: user.id } }).catch(console.error);

    setQuizState("results");
  };

  if (quizState === "select") {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Take a Quiz</h1><p className="text-muted-foreground">Select a topic and test your knowledge</p></div>
        <Card className="max-w-md">
          <CardHeader><CardTitle>Choose Topic</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
              <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={startQuiz} disabled={!selectedTopic} className="w-full"><Play className="mr-2 h-4 w-4" /> Start Quiz</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizState === "results") {
    const pct = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
            <CardDescription>Here's how you did</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="text-5xl font-bold text-primary">{pct}%</div>
            <div className="flex justify-center gap-6 text-sm">
              <div><span className="font-bold text-lg">{results.correct}</span><br/>Correct</div>
              <div><span className="font-bold text-lg">{results.total - results.correct}</span><br/>Incorrect</div>
              <div><span className="font-bold text-lg">{results.retries}</span><br/>Retries</div>
            </div>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Trophy className="h-5 w-5" />
              <span className="text-lg font-bold">+{results.pointsEarned} points earned!</span>
            </div>
            <Progress value={pct} className="h-3" />
            <Button onClick={() => setQuizState("select")} className="w-full">Take Another Quiz</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[currentIdx];
  const opts: string[] = Array.isArray(q.options) ? q.options : [];
  const isCorrectAnswer = selectedAnswer === q.correct_answer;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Live Cognitive Mode Indicator */}
      <CognitiveModeIndicator
        responseTimesMs={allResponseTimes}
        retries={retries + results.retries}
        correctCount={correctSoFar}
        totalCount={totalSoFar}
        sessionStartTime={quizStartTimeRef.current}
      />

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Question {currentIdx + 1} of {questions.length}</div>
        <Badge variant="secondary">Difficulty: {q.difficulty_level}/5</Badge>
      </div>
      <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />

      {/* Shadow Prediction Insight */}
      {postQuizInsight && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0" />
          {postQuizInsight}
        </div>
      )}

      {prediction && !answered && (
        <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 shrink-0" />
          AI Shadow: {Math.round(prediction.predicted_error_probability * 100)}% error risk | ~{Math.round(prediction.predicted_response_time_ms / 1000)}s expected
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">{q.question_text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {opts.map((opt: string, i: number) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              disabled={answered}
              className={cn(
                "w-full rounded-lg border-2 p-4 text-left text-sm font-medium transition-all",
                !answered && "hover:border-primary hover:bg-primary/5",
                answered && opt === q.correct_answer && "border-[hsl(var(--success))] bg-[hsl(var(--success))]/10",
                answered && opt === selectedAnswer && opt !== q.correct_answer && "border-destructive bg-destructive/10",
                !answered && "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                {answered && opt === q.correct_answer && <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />}
                {answered && opt === selectedAnswer && opt !== q.correct_answer && <XCircle className="h-5 w-5 text-destructive" />}
                <span>{opt}</span>
              </div>
            </button>
          ))}

          {q.hint && !showHint && !answered && (
            <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
              <Lightbulb className="mr-2 h-4 w-4" /> Show Hint
            </Button>
          )}
          {showHint && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">💡 {q.hint}</p>}

          <div className="flex gap-2 pt-4">
            {answered && !isCorrectAnswer && (
              <Button variant="outline" onClick={retryQuestion}>Retry</Button>
            )}
            {answered && (
              <Button onClick={nextQuestion}>{currentIdx + 1 >= questions.length ? "Finish" : "Next"}</Button>
            )}
            {!answered && (
              <Button variant="ghost" onClick={skipQuestion}><SkipForward className="mr-2 h-4 w-4" /> Skip</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
