-- Cleanse.ng V2 — cleaner completion report (Stage 10 enhancement).
-- Stores the cleaner's end-of-job report (duration + notes/complaints/positives)
-- on the assignment, so operations can see what actually happened on site.

alter table job_assignments
  add column if not exists completion_report jsonb;
