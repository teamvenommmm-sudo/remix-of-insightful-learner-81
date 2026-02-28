

# Comprehensive Enhancement Plan for CogniLearn AI

## Overview
This plan covers 5 major enhancements: (1) dark mode toggle, (2) gamification system, (3) PDF/CSV export, (4) seed data for all dashboards, and (5) end-to-end flow verification fixes. The goal is to make every dashboard page functional with real data and add engagement features.

---

## 1. Dark Mode Toggle

**What:** Add a theme switcher (light/dark/system) to the sidebar.

**Changes:**
- Create a `ThemeProvider` component using `next-themes` (already installed) wrapping the app in `App.tsx`
- Add a sun/moon toggle button in `DashboardLayout.tsx` sidebar footer, above the sign-out button
- Update `index.html` to add `class="dark"` support on the `<html>` tag

---

## 2. Gamification System (Points, Streaks, Badges, Leaderboard)

**What:** Track student engagement with points, daily streaks, and achievement badges. Add a leaderboard page.

### Database Changes (Migration)
- New table: `student_gamification`
  - `user_id` (uuid, unique, NOT NULL)
  - `total_points` (integer, default 0)
  - `current_streak` (integer, default 0)
  - `longest_streak` (integer, default 0)
  - `last_activity_date` (date)
  - `badges` (jsonb, default '[]') -- array of earned badge names
  - `quizzes_completed` (integer, default 0)
  - RLS: users can read own, teachers/admins can read all, users can upsert own

### Point Rules (implemented in quiz finish logic in `TakeQuiz.tsx`)
- +10 points per correct answer
- +5 bonus for no retries on a question
- +20 bonus for perfect quiz (100%)
- +15 bonus for maintaining a streak

### Badges (checked after each quiz)
- "First Quiz" -- complete first quiz
- "Perfect Score" -- 100% on any quiz
- "Streak Master" -- 7-day streak
- "Topic Explorer" -- attempt 5 different topics
- "Speed Demon" -- avg response time under 5 seconds with 80%+ accuracy

### Frontend Changes
- Add gamification stats cards (points, streak, badges) to `StudentOverview.tsx`
- New page: `Leaderboard.tsx` -- shows top students by points with badges
- Add "Leaderboard" link to student sidebar in `DashboardLayout.tsx`
- Add route in `Dashboard.tsx`

---

## 3. PDF/CSV Export for Reports

**What:** Allow students and teachers to download performance data as CSV or PDF.

### Student Reports Page (`Reports.tsx`)
- Add "Export CSV" button that generates a CSV of session history (date, topic, accuracy, retries, duration)
- Add "Export PDF" button that generates a styled PDF summary using browser print/HTML-to-PDF approach (window.print() with a hidden printable div)

### Teacher Analytics Page (`TeacherAnalytics.tsx`)
- Add "Export Student Data (CSV)" button that exports all students' accuracy, sessions, cognitive types
- Add "Export Class Report (PDF)" similar print-based approach

### Implementation Approach
- CSV: Generate in-browser using a utility function that converts data arrays to CSV and triggers download
- PDF: Use a print-friendly hidden div with `window.print()` -- no extra dependencies needed

---

## 4. Seed Sample Data & Populate All Dashboard Pages

**What:** Create a backend function to seed realistic sample data so every dashboard page shows meaningful content, OR insert data directly via edge function.

### Approach: Edge Function `seed-sample-data`
Create an edge function that, when called by an admin, populates the database with:

- **3 sample topics**: Mathematics, Science, English
- **15 sample questions** (5 per topic, varying difficulty 1-5, with hints and 4 options each)
- This gives teachers content to work with and students quizzes to take

### Enhancing Dashboard Pages with Real Queries

Currently some pages show empty states. After seeding data and users taking quizzes, all pages will populate. But we also need to enhance several pages that are currently too sparse:

**Teacher Dashboard Enhancements:**
- `TeacherOverview.tsx`: Add "At-Risk Students" alert list (students with accuracy below 40% or declining trend), add topic difficulty index bar chart
- `StudentAnalysis.tsx`: Add expandable rows showing per-student weak topics, response time trends, and cognitive shift history
- `TeacherAnalytics.tsx`: Add class-wide improvement trend chart, total attempts over time chart, add average response time by topic

**Admin Dashboard Enhancements:**
- `AdminOverview.tsx`: Add recent activity feed (latest sessions), system health indicators, charts showing user growth and session trends
- `UserManagement.tsx`: Add ability to change user roles (dropdown), add search/filter functionality

**Student Dashboard Enhancements:**
- `SessionInsights.tsx`: Add error frequency distribution chart, time-per-topic pie chart
- `TopicMastery.tsx`: Add color-coded heatmap-style visualization instead of just progress bars
- `Recommendations.tsx`: Show focus topics as clickable badges, show review schedule as a calendar-like view

---

## 5. End-to-End Flow Fixes

### Issues to Address
- The `cognitive_profiles` table upsert in the edge function uses `onConflict: "user_id"` but there is no unique constraint on `user_id` -- need to add a unique constraint via migration
- The `topic_performance` upsert uses `onConflict: "user_id,topic_id"` but similarly needs a unique constraint -- need to add composite unique constraint
- The `recommendations` and `cognitive_profiles` tables have no INSERT/UPDATE policies for the service role (edge function uses service role key, so this is fine, but verify)
- Auth: signup currently shows "Check your email" but auto-confirm is enabled -- update the message to redirect directly to dashboard after signup

---

## Technical Details

### New Files
1. `src/components/ThemeProvider.tsx` -- dark mode provider
2. `src/components/ThemeToggle.tsx` -- toggle button component
3. `src/pages/dashboard/Leaderboard.tsx` -- student leaderboard page
4. `src/lib/export-utils.ts` -- CSV/PDF export utility functions
5. `supabase/functions/seed-sample-data/index.ts` -- sample data seeder

### Modified Files
1. `src/App.tsx` -- wrap with ThemeProvider
2. `index.html` -- add dark class support
3. `src/components/DashboardLayout.tsx` -- add theme toggle, leaderboard link
4. `src/pages/Dashboard.tsx` -- add leaderboard route
5. `src/pages/dashboard/TakeQuiz.tsx` -- add gamification point tracking after quiz
6. `src/pages/dashboard/StudentOverview.tsx` -- add gamification stats cards
7. `src/pages/dashboard/Reports.tsx` -- add CSV/PDF export buttons
8. `src/pages/dashboard/TeacherOverview.tsx` -- add at-risk students, topic difficulty
9. `src/pages/dashboard/TeacherAnalytics.tsx` -- add export, more charts
10. `src/pages/dashboard/AdminOverview.tsx` -- add activity feed, charts
11. `src/pages/dashboard/UserManagement.tsx` -- add role change, search
12. `src/pages/dashboard/StudentAnalysis.tsx` -- add expandable detail rows
13. `src/pages/dashboard/SessionInsights.tsx` -- add more chart types
14. `src/pages/dashboard/TopicMastery.tsx` -- enhance visualization
15. `src/pages/dashboard/Recommendations.tsx` -- enhance display
16. `src/pages/Auth.tsx` -- fix post-signup redirect

### Database Migrations
1. Add `student_gamification` table with RLS policies
2. Add unique constraint on `cognitive_profiles(user_id)`
3. Add composite unique constraint on `topic_performance(user_id, topic_id)`

### Edge Functions
1. `seed-sample-data` -- creates sample topics and questions for testing

---

## Implementation Order
1. Database migrations (gamification table, unique constraints)
2. Dark mode (ThemeProvider, toggle)
3. Gamification (table, quiz integration, leaderboard)
4. Export utilities (CSV/PDF)
5. Seed data edge function
6. Enhance all dashboard pages with richer data displays
7. Fix auth flow (post-signup redirect)

