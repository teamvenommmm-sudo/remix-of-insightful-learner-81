import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, BarChart3, Lightbulb, GraduationCap, Users, Layers } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">CogniLearn AI</span>
          </div>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            AI-Powered Cognitive<br />
            <span className="text-primary">Learning Pattern Analyzer</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Understand how you learn. Our AI analyzes your behavioral patterns during quizzes to classify your cognitive learning type and provide personalized strategies for improvement.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/auth"><Button size="lg">Start Learning</Button></Link>
            <Button variant="outline" size="lg">Learn More</Button>
          </div>
        </section>

        <section className="border-t border-border bg-card py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
            {[
              { icon: Brain, title: "Cognitive Profiling", desc: "AI classifies your learning type based on response times, retry patterns, and accuracy metrics." },
              { icon: Lightbulb, title: "Adaptive Strategies", desc: "Get personalized recommendations tailored to your unique cognitive learning pattern." },
              { icon: BarChart3, title: "Performance Analytics", desc: "Track your improvement over time with detailed charts and reports." },
              { icon: GraduationCap, title: "Interactive Quizzes", desc: "Behavioral data is captured per question to build your cognitive profile." },
              { icon: Users, title: "Teacher Dashboards", desc: "Teachers get class-wide analytics and at-risk student alerts." },
              { icon: Layers, title: "Topic Mastery", desc: "Visualize your strengths and weaknesses across all learning topics." },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border border-border bg-background p-6">
                <f.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 CogniLearn AI. Adaptive Learning Platform.
      </footer>
    </div>
  );
}
