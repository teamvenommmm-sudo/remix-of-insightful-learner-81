

# AI-Based Cognitive Learning Pattern Analyzer

## Overview
A full-stack adaptive learning platform that collects student behavioral data during quizzes, uses AI (Lovable AI/Gemini) to classify cognitive learning patterns, and provides personalized learning recommendations. Supports Student, Teacher, and Admin roles with dedicated dashboards.

---

## Phase 1: Foundation — Auth, Roles & Database

### Authentication & Role System
- Email/password signup and login for all users (Students, Teachers, Admins)
- Role-based access using a `user_roles` table (admin, teacher, student)
- Profile management with display name and avatar
- Protected routes based on role

### Database Schema (Supabase/PostgreSQL)
- **profiles** — user display info
- **user_roles** — role assignments (student/teacher/admin)
- **topics** — learning topics/subjects
- **questions** — quiz questions with difficulty levels, linked to topics
- **question_attempts** — per-attempt behavioral data (response time, retries, correctness, hints used, hesitation time, abandonment)
- **session_logs** — session-level aggregates (duration, total attempts, accuracy)
- **topic_performance** — per-student per-topic accuracy and trend data
- **cognitive_profiles** — AI-generated cognitive classification per student
- **recommendations** — personalized learning strategies
- **performance_reports** — weekly/monthly analytics snapshots

---

## Phase 2: Content Management (Teacher/Admin)

### Question & Topic Management
- Teachers can create, edit, and organize topics
- Teachers can create questions with: text, options, correct answer, difficulty level, topic assignment, hints
- Bulk question creation support
- Question preview and testing

---

## Phase 3: Quiz Engine & Behavioral Data Collection

### Student Quiz Experience
- Students select topics or get recommended quizzes
- Timer-tracked question answering with behavioral capture
- For each attempt, the system records: response time, retry count, hint usage, time between attempts, abandonment, correctness

### Session Tracking
- Automatic session creation and logging
- Session duration, total questions, accuracy rate
- Per-topic performance aggregation after each session

---

## Phase 4: AI-Powered Cognitive Analysis

### Feature Engineering (Edge Function)
- Compute behavioral features per student: average response time, response time variance, retry ratio, error frequency, topic accuracy, learning velocity, hesitation index, consistency index, session improvement rate, concept gap score

### Cognitive Classification (Lovable AI)
- Send feature vectors to an AI edge function that uses Lovable AI (Gemini) to classify students into cognitive types:
  - Fast & Accurate Learner
  - Fast but Careless Learner
  - Slow but Accurate Learner
  - Trial-and-Error Learner
  - Concept Gap Learner
  - High Cognitive Load Learner
  - Inconsistent Performer
  - Struggling Retention Learner
- Classification stored in `cognitive_profiles` table, updated after each session
- Explainable output: AI provides reasoning for classification

### Adaptive Recommendation Engine (Lovable AI)
- AI generates personalized recommendations based on cognitive type, weak topics, and performance trends
- Recommendations include: difficulty adjustment, focus topics, practice type, review schedule, learning strategy summary
- Stored in `recommendations` table for dashboard display

---

## Phase 5: Student Dashboard

### Overview Page
- Current cognitive type badge with description
- Accuracy trend line chart (over sessions)
- Response time trend chart
- Weekly improvement score
- Learning velocity indicator

### Topic Mastery Page
- Heatmap showing accuracy per topic
- Weak topic alerts with improvement suggestions
- Topic-by-topic breakdown with retry/error stats

### Session Insights Page
- Retry behavior graph per session
- Error frequency distribution
- Time spent per topic visualization
- Cognitive consistency trend

### Recommendations Page
- Current personalized learning strategy
- Suggested practice activities
- Spaced repetition review schedule
- Progress on previous recommendations

---

## Phase 6: Teacher Dashboard

### Class Overview
- Cognitive type distribution chart (pie/bar chart showing how many students in each category)
- At-risk student alert list (struggling or declining students)
- Topic difficulty index (which topics cause the most errors)

### Student Deep Analysis
- Individual student performance timeline
- Weak topic map per student
- Cognitive type shift history
- Behavioral pattern details

### Analytics & Export
- Class-wide improvement trends
- Downloadable PDF/CSV performance reports
- Comparison tables across students

---

## Phase 7: Admin Dashboard

### User Management
- View and manage all users (students, teachers)
- Assign/change roles
- Account activation/deactivation

### System Overview
- Total users, sessions, questions statistics
- System health metrics
- Content overview (topics and questions count)

---

## Phase 8: Performance Analytics Engine

### Automated Analytics
- Weekly improvement percentage calculation
- Cognitive pattern shift detection (alert when a student's type changes)
- Retention risk scoring
- Performance trajectory prediction (using AI trend analysis)
- Early warning system for at-risk students

### Reports
- Auto-generated weekly performance reports per student
- Cognitive shift history tracking
- Downloadable reports for students and teachers

---

## Design & UX
- Clean, modern interface with Tailwind CSS
- Responsive design for desktop and tablet
- Color-coded cognitive type badges throughout the app
- Interactive charts using Recharts for all visualizations
- Toast notifications for important updates
- Dark mode support

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Recharts
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Lovable AI (Gemini) for cognitive classification and recommendations
- **Auth**: Supabase Auth with role-based access control

