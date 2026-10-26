-- Brief 37 / RISK-138: give package line items a real id link instead of the
-- notes-text "Package: <name>" reconstruction (same defect class as RISK-038/057
-- for products). Both columns nullable and SET NULL so renaming/deleting a
-- catalog package or a patient's package never breaks the historical row.
ALTER TABLE reservation_products
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_package_id uuid REFERENCES customer_packages(id) ON DELETE SET NULL;
