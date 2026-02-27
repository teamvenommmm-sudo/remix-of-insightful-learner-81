import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle2, XCircle, Lightbulb, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

type QuizState = "select" | "active" | "results";

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
  const [results, setResults] = useState({ correct: 0, total: 0, retries: 0 });
  const [retries, setRetries] = useState(0);
  const startTimeRef = useRef<number>(0);
  const lastAttemptTimeRef = useRef<number>(0);

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
    setResults({ correct: 0, total: 0, retries: 0 });
    setQuizState("active");
    startTimeRef.current = Date.now();
    lastAttemptTimeRef.current = Date.now();
  };

  const handleAnswer = async (answer: string) => {
    if (answered || !user || !sessionId) return;
    const q = questions[currentIdx];
    const isCorrect = answer === q.correct_answer;
    const now = Date.now();
    const responseTime = now - startTimeRef.current;
    const timeBetween = retries > 0 ? now - lastAttemptTimeRef.current : null;

    await supabase.from("question_attempts").insert({
      user_id: user.id,
      session_id: sessionId,
      question_id: q.id,
      topic_id: q.topic_id,
      difficulty_level: q.difficulty_level,
      response_time_ms: responseTime,
      number_of_retries: retries,
      is_correct: isCorrect,
      hint_used: showHint,
      time_between_attempts_ms: timeBetween,
      abandonment_flag: false,
      selected_answer: answer,
    });

    setSelectedAnswer(answer);
    setAnswered(true);

    if (isCorrect) {
      setResults((r) => ({ ...r, correct: r.correct + 1, total: r.total + 1, retries: r.retries + retries }));
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
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setShowHint(false);
      setRetries(0);
      startTimeRef.current = Date.now();
      lastAttemptTimeRef.current = Date.now();
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
    const sessionStart = startTimeRef.current;
    const duration = Math.round((Date.now() - sessionStart) / 1000);
    await supabase.from("session_logs").update({
      ended_at: new Date().toISOString(),
      total_questions_attempted: results.total,
      total_correct: results.correct,
      total_retries: results.retries,
      session_duration_seconds: duration,
    }).eq("id", sessionId);

    // Trigger AI analysis (fire and forget)
    supabase.functions.invoke("analyze-cognitive", { body: { user_id: user.id } }).catch(console.error);

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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Question {currentIdx + 1} of {questions.length}</div>
        <Badge variant="secondary">Difficulty: {q.difficulty_level}/5</Badge>
      </div>
      <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />

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
