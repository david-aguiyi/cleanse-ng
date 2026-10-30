Files here are served only to signed-in admins (never from /public).

- invoice-maker.html: the self-contained Cleanse Invoice Maker (jsPDF and
  fonts inlined). Served by app/admin/invoices/maker/route.ts and shown at
  /admin/invoices, where it saves invoices to the `invoices` table and gets
  its numbers from Postgres.

This repository is PUBLIC. Never put bank details, client data or other
private values in these files: a new invoice copies the bank and deposit
settings from the latest saved invoice in the database instead.
