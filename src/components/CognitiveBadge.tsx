import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  "Fast & Accurate Learner": "bg-[hsl(var(--cognitive-fast-accurate))] text-white",
  "Fast but Careless Learner": "bg-[hsl(var(--cognitive-fast-careless))] text-white",
  "Slow but Accurate Learner": "bg-[hsl(var(--cognitive-slow-accurate))] text-white",
  "Trial-and-Error Learner": "bg-[hsl(var(--cognitive-trial-error))] text-white",
  "Concept Gap Learner": "bg-[hsl(var(--cognitive-concept-gap))] text-white",
  "High Cognitive Load Learner": "bg-[hsl(var(--cognitive-high-load))] text-white",
  "Inconsistent Performer": "bg-[hsl(var(--cognitive-inconsistent))] text-foreground",
  "Struggling Retention Learner": "bg-[hsl(var(--cognitive-struggling))] text-white",
  "Unclassified": "bg-muted text-muted-foreground",
};

export default function CognitiveBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("cognitive-badge", typeColors[type] || typeColors["Unclassified"], className)}>
      {type}
    </span>
  );
}
