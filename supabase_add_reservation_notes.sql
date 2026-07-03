-- =====================================================================
-- Adds a free-text "notes" (description / remarque) column to
-- public.reservations, so the client can attach an optional note when
-- creating or editing a reservation. Safe to re-run.
-- =====================================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS notes TEXT;
