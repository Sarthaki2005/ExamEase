# ExamEase - Corrected Full Working Version

Node.js + Express + SQLite online examination system.

## Included data

This version preserves the custom database seed data supplied for ExamEase, including the original users/exams and the additional 50 students, 10 faculty and questions Q101-Q150.

Default seeded password: `demo1234`

## Important first run

1. Open this `examease` folder in VS Code.
2. If an old `examease.sqlite` was created by an earlier broken version and you do not need its attempts/results, delete:
   - `examease.sqlite`
   - `examease.sqlite-shm`
   - `examease.sqlite-wal`
3. Install dependencies:

```bash
npm install
```

4. Start:

```bash
npm start
```

5. Open `http://localhost:3000`

## Database fixes included

The database keeps the original ExamEase question schema (`correct_index`) so the supplied question data remains unchanged. It also automatically migrates older databases by adding `attempts.question_order` and creates the required unique index on `(attempt_id, question_id)` for answer autosave/submit.

## Main functionality

- Student/faculty/admin login
- Question bank with MCQ, true/false and descriptive questions
- Exam creation and question selection
- Scheduling and active exams
- Server-side exam duration enforcement
- Stable randomized question order per attempt
- Answer autosave and resume
- Automatic MCQ/TF grading
- Faculty evaluation of descriptive answers
- Student results, ranking and subject performance
- Result PDF generation
- Basic browser proctoring: camera, tab/window focus and fullscreen events
- Faculty monitoring
- Admin user management
