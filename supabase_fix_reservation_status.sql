-- =====================================================================
-- ONE-TIME REPAIR: fix reservation statuses corrupted by the old bug.
--
-- The previous app code always inserted new reservations with
-- status = 'debt' (hard-coded) and only computed the "real" status in
-- the browser, so the value in the database never matched what was
-- shown. After a page refresh the wrong 'debt' value reappeared.
--
-- The application code is now fixed, so NEW reservations are stored
-- with the correct status. This script repairs the rows that were
-- already saved with a wrong status, aligning them with the new
-- lifecycle model:
--
--   pending  -> check-in is in the future            (must be activated)
--   active   -> stay currently in progress           (check_in <= today < check_out)
--   paid     -> stay finished AND fully paid
--   debt     -> stay finished with a remaining balance
--
-- Cancelled reservations are left untouched.
-- Dates are compared in UTC to match the app (todayISO() uses UTC).
--
-- No schema change is required: the existing CHECK constraint on
-- reservations.status already allows all of these values.
-- =====================================================================

UPDATE public.reservations r
SET status = CASE
  WHEN r.check_in > (now() AT TIME ZONE 'utc')::date THEN 'pending'
  WHEN (now() AT TIME ZONE 'utc')::date < r.check_out THEN 'active'
  WHEN COALESCE((
    SELECT SUM(p.amount) FROM public.payments p WHERE p.reservation_id = r.id
  ), 0) >= r.total THEN 'paid'
  ELSE 'debt'
END
WHERE r.status <> 'cancelled';

-- Optional: verify the result
-- SELECT code, check_in, check_out, total,
--        COALESCE((SELECT SUM(amount) FROM public.payments p WHERE p.reservation_id = r.id), 0) AS paid,
--        status
-- FROM public.reservations r
-- ORDER BY created_at DESC;
