import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import StudentOverview from "./dashboard/StudentOverview";
import TeacherOverview from "./dashboard/TeacherOverview";
import AdminOverview from "./dashboard/AdminOverview";
import ManageTopics from "./dashboard/ManageTopics";
import ManageQuestions from "./dashboard/ManageQuestions";
import TakeQuiz from "./dashboard/TakeQuiz";
import TopicMastery from "./dashboard/TopicMastery";
import SessionInsights from "./dashboard/SessionInsights";
import Recommendations from "./dashboard/Recommendations";
import Reports from "./dashboard/Reports";
import StudentAnalysis from "./dashboard/StudentAnalysis";
import TeacherAnalytics from "./dashboard/TeacherAnalytics";
import UserManagement from "./dashboard/UserManagement";
import Leaderboard from "./dashboard/Leaderboard";
import CognitiveDrift from "./dashboard/CognitiveDrift";
import CognitiveEnergy from "./dashboard/CognitiveEnergy";
import TeacherCognitiveIntel from "./dashboard/TeacherCognitiveIntel";

function OverviewRouter() {
  const { role } = useAuth();
  if (role === "teacher") return <TeacherOverview />;
  if (role === "admin") return <AdminOverview />;
  return <StudentOverview />;
}

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<OverviewRouter />} />
        <Route path="quiz" element={<TakeQuiz />} />
        <Route path="topics" element={<TopicMastery />} />
        <Route path="sessions" element={<SessionInsights />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="cognitive-drift" element={<CognitiveDrift />} />
        <Route path="cognitive-energy" element={<CognitiveEnergy />} />
        <Route path="cognitive-intel" element={<TeacherCognitiveIntel />} />
        <Route path="manage-topics" element={<ManageTopics />} />
        <Route path="manage-questions" element={<ManageQuestions />} />
        <Route path="students" element={<StudentAnalysis />} />
        <Route path="analytics" element={<TeacherAnalytics />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="settings" element={<div className="text-muted-foreground">Settings page coming soon</div>} />
      </Routes>
    </DashboardLayout>
  );
}
