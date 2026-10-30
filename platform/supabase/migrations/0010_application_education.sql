-- Cleanse.ng V2 — highest level of education on Cleanse Pro applications.
-- Nullable so applications submitted before this question existed stay valid.
alter table cleaner_applications add column if not exists education text;
