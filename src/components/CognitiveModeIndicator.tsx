import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Brain } from "lucide-react";

type CognitiveMode = "focused" | "struggling" | "fatigue" | "analytical";

interface Props {
  responseTimesMs: number[];
  retries: number;
  correctCount: number;
  totalCount: number;
  sessionStartTime: number;
}

function detectMode(props: Props): CognitiveMode {
  const { responseTimesMs, retries, correctCount, totalCount, sessionStartTime } = props;
  const sessionMinutes = (Date.now() - sessionStartTime) / 60000;
  const recentAccuracy = totalCount > 0 ? correctCount / totalCount : 1;
  const avgRT = responseTimesMs.length > 0
    ? responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length : 0;
  const recentRTs = responseTimesMs.slice(-3);
  const recentAvgRT = recentRTs.length > 0
    ? recentRTs.reduce((a, b) => a + b, 0) / recentRTs.length : 0;

  // Fatigue: session > 20min AND (accuracy dropping or response time increasing)
  if (sessionMinutes > 20 && (recentAccuracy < 0.5 || recentAvgRT > avgRT * 1.5)) {
    return "fatigue";
  }

  // Struggling: low accuracy or high retries
  if (totalCount >= 2 && (recentAccuracy < 0.4 || retries > totalCount)) {
    return "struggling";
  }

  // Analytical: slow but accurate
  if (recentAccuracy >= 0.7 && avgRT > 15000) {
    return "analytical";
  }

  // Focused: good accuracy, reasonable speed
  return "focused";
}

const modeConfig: Record<CognitiveMode, { label: string; color: string; emoji: string; description: string }> = {
  focused: {
    label: "Focused Mode",
    color: "bg-[hsl(var(--success))]",
    emoji: "🟢",
    description: "You're in the zone!",
  },
  struggling: {
    label: "Struggling Mode",
    color: "bg-[hsl(var(--warning))]",
    emoji: "🟡",
    description: "Take a breath, you've got this",
  },
  fatigue: {
    label: "Fatigue Mode",
    color: "bg-destructive",
    emoji: "🔴",
    description: "Consider taking a break",
  },
  analytical: {
    label: "Analytical Mode",
    color: "bg-[hsl(var(--info))]",
    emoji: "🔵",
    description: "Deep thinking detected",
  },
};

export default function CognitiveModeIndicator(props: Props) {
  const [mode, setMode] = useState<CognitiveMode>("focused");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const newMode = detectMode(props);
    if (newMode !== mode) {
      setMode(newMode);
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }
  }, [props.responseTimesMs.length, props.retries, props.correctCount, props.totalCount]);

  const config = modeConfig[mode];

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border p-3 transition-all duration-500",
      pulse && "ring-2 ring-primary/50"
    )}>
      <div className="relative">
        <Brain className="h-6 w-6 text-foreground" />
        <span className={cn(
          "absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card",
          config.color,
          "animate-pulse"
        )} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{config.emoji} {config.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
    </div>
  );
}
