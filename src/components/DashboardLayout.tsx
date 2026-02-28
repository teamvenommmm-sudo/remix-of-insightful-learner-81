import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Brain, LayoutDashboard, BookOpen, BarChart3, Lightbulb, FileText,
  Users, Settings, LogOut, GraduationCap, Layers, Activity, Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";

const studentLinks = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/quiz", label: "Take Quiz", icon: GraduationCap },
  { to: "/dashboard/topics", label: "Topic Mastery", icon: Layers },
  { to: "/dashboard/sessions", label: "Session Insights", icon: Activity },
  { to: "/dashboard/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/dashboard/reports", label: "Reports", icon: FileText },
  { to: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
];

const teacherLinks = [
  { to: "/dashboard", label: "Class Overview", icon: LayoutDashboard },
  { to: "/dashboard/manage-topics", label: "Manage Topics", icon: BookOpen },
  { to: "/dashboard/manage-questions", label: "Manage Questions", icon: Layers },
  { to: "/dashboard/students", label: "Student Analysis", icon: Users },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

const adminLinks = [
  { to: "/dashboard", label: "System Overview", icon: LayoutDashboard },
  { to: "/dashboard/users", label: "User Management", icon: Users },
  { to: "/dashboard/manage-topics", label: "Manage Topics", icon: BookOpen },
  { to: "/dashboard/manage-questions", label: "Manage Questions", icon: Layers },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = role === "teacher" ? teacherLinks : role === "admin" ? adminLinks : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Brain className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">CogniLearn AI</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 space-y-2">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {profile?.display_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.display_name || "User"}</p>
              <p className="text-xs capitalize text-muted-foreground">{role}</p>
            </div>
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
