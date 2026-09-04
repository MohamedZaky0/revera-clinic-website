-- 20260806202500_cascade_delete_package_revenue_recognitions.sql
-- Change foreign key constraint package_revenue_recognitions_reservation_id_fkey
-- from ON DELETE RESTRICT to ON DELETE CASCADE so reservations can be deleted without FK errors.

ALTER TABLE public.package_revenue_recognitions
  DROP CONSTRAINT IF EXISTS package_revenue_recognitions_reservation_id_fkey,
  ADD CONSTRAINT package_revenue_recognitions_reservation_id_fkey
    FOREIGN KEY (reservation_id)
    REFERENCES public.reservations(id)
    ON DELETE CASCADE;
