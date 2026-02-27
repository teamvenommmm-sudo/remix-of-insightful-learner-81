import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ManageQuestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    question_text: "",
    topic_id: "",
    difficulty_level: 1,
    correct_answer: "",
    hint: "",
    options: ["", "", "", ""],
  });

  const load = async () => {
    const [qRes, tRes] = await Promise.all([
      supabase.from("questions").select("*, topics(name)").order("created_at", { ascending: false }),
      supabase.from("topics").select("*").order("name"),
    ]);
    setQuestions(qRes.data || []);
    setTopics(tRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ question_text: "", topic_id: "", difficulty_level: 1, correct_answer: "", hint: "", options: ["", "", "", ""] });

  const handleSave = async () => {
    if (!form.question_text.trim() || !form.topic_id || !form.correct_answer) return;
    const payload = {
      question_text: form.question_text,
      topic_id: form.topic_id,
      difficulty_level: form.difficulty_level,
      correct_answer: form.correct_answer,
      hint: form.hint || null,
      options: form.options.filter(Boolean),
      created_by: user?.id,
    };

    if (editing) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Question updated" });
    } else {
      const { error } = await supabase.from("questions").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Question created" });
    }
    setDialogOpen(false);
    setEditing(null);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    toast({ title: "Question deleted" });
    load();
  };

  const openEdit = (q: any) => {
    setEditing(q);
    const opts = Array.isArray(q.options) ? q.options : [];
    setForm({
      question_text: q.question_text,
      topic_id: q.topic_id,
      difficulty_level: q.difficulty_level,
      correct_answer: q.correct_answer,
      hint: q.hint || "",
      options: [...opts, "", "", "", ""].slice(0, 4),
    });
    setDialogOpen(true);
  };

  const openNew = () => { setEditing(null); resetForm(); setDialogOpen(true); };

  const difficultyLabel = (level: number) => {
    const labels = ["", "Easy", "Medium", "Hard", "Expert", "Master"];
    return labels[level] || "Unknown";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Questions</h1>
          <p className="text-muted-foreground">Create and manage quiz questions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Question" : "New Question"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select value={form.topic_id} onValueChange={(v) => setForm({ ...form, topic_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                {form.options.map((opt, i) => (
                  <Input key={i} placeholder={`Option ${i + 1}`} value={opt}
                    onChange={(e) => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }} />
                ))}
              </div>
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder="Must match one of the options" />
              </div>
              <div className="space-y-2">
                <Label>Difficulty (1-5)</Label>
                <Select value={String(form.difficulty_level)} onValueChange={(v) => setForm({ ...form, difficulty_level: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((d) => <SelectItem key={d} value={String(d)}>{d} - {difficultyLabel(d)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hint (optional)</Label>
                <Input value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} />
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No questions yet. Create topics first, then add questions!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex-1">
                  <CardTitle className="text-base">{q.question_text}</CardTitle>
                  <CardDescription className="mt-1 flex gap-2">
                    <Badge variant="outline">{(q as any).topics?.name || "Unknown"}</Badge>
                    <Badge variant="secondary">Difficulty: {q.difficulty_level}</Badge>
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
