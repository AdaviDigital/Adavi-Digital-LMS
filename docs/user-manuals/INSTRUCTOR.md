# Instructor User Manual — Adavi Digital Institute

## Getting Started
1. Register and choose "Teach (Instructor)" as your account type.
2. Log in and go to **Instructor Dashboard** (accessible after login).

## Creating a Course
1. Click **+ New Course** on your dashboard.
2. Fill in the title, description, category, and pricing (free or paid).
3. Your course is created as a **Draft** — it's not visible to students yet.

## Building Your Curriculum
Course content follows: **Course → Modules → Lessons → Resources/Quiz/Assignment**.

From your **Instructor Dashboard → My Courses → Edit curriculum**, you get a visual course builder:
1. **Add a module** (a section of your course) using the field at the bottom of the builder.
2. **Add a lesson** inside any module — set its title, content type, video URL, an optional transcript,
   and whether it's a free preview lesson (visible to non-enrolled visitors).
3. **Drag to reorder** — grab the handle on any module or lesson and drag it into place. The new order
   saves automatically.
4. **Rename** a module inline (pencil icon) or **delete** a module/lesson (trash icon) — deleting a
   module removes all its lessons too, so you'll be asked to confirm.
5. Add a transcript to any lesson if you want the **AI Chat Tutor** and **AI Lesson Summary** features
   to work for it.

Once you have at least one module with at least one lesson, click **Submit for Review** at the top of
the builder. This moves your course from `DRAFT` to `PENDING_REVIEW`, ready for an admin to approve.

For quizzes, assignments, and additional resources beyond what the visual builder covers today, use the
API directly (a Postman collection with every endpoint is included in `postman/`):
1. **Add resources** (PDFs, slides): `POST /api/v1/lessons/:id/resources`
2. **Add a quiz**: `POST /api/v1/quizzes` — supports Multiple Choice, True/False, Essay, Matching,
   Drag & Drop, and Fill-in-the-Blank question types.
3. **Add an assignment**: `POST /api/v1/assignments`
4. **AI-assisted quiz drafting**: `POST /api/v1/ai/generate-quiz` with a `lessonId` — generates draft
   multiple-choice questions from your lesson transcript that you can review and publish as a real quiz.

## Publishing
Once you submit your course for review, an **Admin** reviews and approves it
(`Admin Panel → Pending Course Approvals`). Approved courses become `PUBLISHED` and appear in the public
catalog. If rejected, the course returns to `DRAFT` status (with a reason) so you can revise and resubmit.

## Managing Students
- View your enrolled students: `GET /api/v1/enrollments/course/:courseId`
- Grade assignment submissions: `PATCH /api/v1/assignments/submissions/:id/grade`
- Message students directly through the messaging system.

## Tracking Performance
Your **Instructor Dashboard** shows:
- Total courses, total students, total revenue, average rating
- Per-course engagement analytics (enrollment count, average progress) via
  `GET /api/v1/analytics/course/:courseId`

## Getting Paid
Revenue from paid enrollments is tracked automatically per successful payment. Payout mechanics
(bank transfer schedule, minimum threshold) are configured by the platform admin — contact support
for your payout details.
